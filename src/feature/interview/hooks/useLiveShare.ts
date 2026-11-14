import { useCallback, useEffect, useRef } from "react";
import { liveSocketUrl, type LiveInterviewState } from "../../../shared/api/liveApi";

const STATE_THROTTLE_MS = 400;

// The copy sent to the therapist: enough to see facial expressions, light on the
// patient's phone and data. (The recording for the analysis is not affected.)
const LIVE_VIDEO = { height: 360, maxFramerate: 20, maxBitrate: 600_000 };

/** Cap the live video's size, frame rate and bitrate; keep it smooth rather than sharp. */
async function capLiveVideo(sender: RTCRtpSender): Promise<void> {
  const track = sender.track;
  if (!track || track.kind !== "video") return;
  const params = sender.getParameters();
  if (!params.encodings?.length) params.encodings = [{}];
  const height = track.getSettings().height ?? LIVE_VIDEO.height;
  params.encodings[0] = {
    ...params.encodings[0],
    maxBitrate: LIVE_VIDEO.maxBitrate,
    maxFramerate: LIVE_VIDEO.maxFramerate,
    scaleResolutionDownBy: Math.max(1, height / LIVE_VIDEO.height),
  };
  (params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = "maintain-framerate";
  await sender.setParameters(params);
}

interface PeerRefs {
  ws: { current: WebSocket | null };
  peers: { current: Map<string, RTCPeerConnection> };
  ice: { current: RTCIceServer[] };
  stream: { current: MediaStream | null };
}

/** Offer the room's camera + mic to one viewer; retried once more if the connection fails. */
function startPeer(refs: PeerRefs, viewerId: string): void {
  const send = (message: unknown) => {
    const ws = refs.ws.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  };
  const close = () => {
    refs.peers.current.get(viewerId)?.close();
    refs.peers.current.delete(viewerId);
  };
  close();
  const pc = new RTCPeerConnection({ iceServers: refs.ice.current });
  refs.peers.current.set(viewerId, pc);
  const media = refs.stream.current;
  if (media) for (const track of media.getTracks()) pc.addTrack(track, media);
  pc.onicecandidate = (e) => {
    if (e.candidate) send({ type: "signal", to: viewerId, data: { candidate: e.candidate.toJSON() } });
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" && refs.peers.current.get(viewerId) === pc) startPeer(refs, viewerId);
  };
  void pc
    .createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .then(() => send({ type: "signal", to: viewerId, data: { sdp: pc.localDescription } }))
    // Best effort: an older browser that can't cap the video still sends it, just heavier.
    .then(() => Promise.all(pc.getSenders().map((s) => capLiveVideo(s).catch(() => {}))))
    .catch(close);
}

/**
 * Lets the patient's therapist watch the interview live. Connects the interview
 * room to the backend; when the therapist opens the live view, the camera and
 * microphone the room already uses are sent to them over WebRTC (a copy — the
 * recording for the analysis is untouched), along with the interview's progress.
 * Nothing is sent while no therapist is watching except the progress.
 */
export function useLiveShare(token: string | undefined, stream: MediaStream | null, state: LiveInterviewState) {
  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const iceRef = useRef<RTCIceServer[]>([]);
  const streamRef = useRef<MediaStream | null>(stream);
  const stateRef = useRef(state);
  const offerTo = useCallback(
    (viewerId: string) => startPeer({ ws: wsRef, peers: peersRef, ice: iceRef, stream: streamRef }, viewerId),
    [],
  );

  // Connect to the live server for as long as the room is open; reconnect if it drops.
  useEffect(() => {
    if (!token || typeof WebSocket === "undefined" || typeof RTCPeerConnection === "undefined") return;
    const peers = peersRef.current;
    let stopped = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const closeAll = () => {
      for (const id of [...peers.keys()]) {
        peers.get(id)?.close();
        peers.delete(id);
      }
    };

    const connect = () => {
      const ws = new WebSocket(liveSocketUrl());
      wsRef.current = ws;
      ws.onopen = () => {
        retries = 0;
        ws.send(JSON.stringify({ type: "hello", role: "patient", token }));
      };
      ws.onmessage = (event) => {
        let msg: { type?: string; viewerId?: string; from?: string; iceServers?: RTCIceServer[]; data?: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } };
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (msg.type === "welcome") {
          iceRef.current = msg.iceServers ?? [];
          ws.send(JSON.stringify({ type: "state", state: stateRef.current }));
        } else if (msg.type === "viewer-joined" && msg.viewerId) {
          offerTo(msg.viewerId);
        } else if (msg.type === "viewer-left" && msg.viewerId) {
          peers.get(msg.viewerId)?.close();
          peers.delete(msg.viewerId);
        } else if (msg.type === "signal" && msg.from) {
          const pc = peers.get(msg.from);
          if (!pc) return;
          if (msg.data?.sdp) void pc.setRemoteDescription(msg.data.sdp).catch(() => {});
          if (msg.data?.candidate) void pc.addIceCandidate(msg.data.candidate).catch(() => {});
        }
      };
      ws.onclose = (event) => {
        closeAll();
        if (wsRef.current === ws) wsRef.current = null;
        // 4403: the link is finished or invalid — don't keep trying.
        if (stopped || event.code === 4403) return;
        retries += 1;
        retryTimer = setTimeout(connect, Math.min(10_000, 2_000 * retries));
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
      closeAll();
    };
  }, [token, offerTo]);

  // The camera was (re)started: give viewers the new tracks.
  useEffect(() => {
    streamRef.current = stream;
    if (!stream) return;
    for (const viewerId of [...peersRef.current.keys()]) offerTo(viewerId);
  }, [stream, offerTo]);

  // Report progress (throttled: captions change many times a second). Keyed on the
  // content, since `state` is a new object on every render.
  const stateKey = JSON.stringify(state);
  useEffect(() => {
    const latest = JSON.parse(stateKey) as LiveInterviewState;
    stateRef.current = latest;
    const timer = setTimeout(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "state", state: latest }));
    }, STATE_THROTTLE_MS);
    return () => clearTimeout(timer);
  }, [stateKey]);
}
