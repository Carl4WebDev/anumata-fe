import { useCallback, useEffect, useRef, useState } from "react";
import { liveSocketUrl, mergeTalk, type LiveInterviewState, type LiveTalkItem } from "../../../shared/api/liveApi";

export type LiveStatus =
  /** Connecting to the server. */
  | "connecting"
  /** Connected; the patient isn't in the interview room. */
  | "waiting"
  /** The patient is in the room; video is connecting or playing. */
  | "live"
  /** Not this therapist's interview, or the login expired. */
  | "denied"
  /** The connection to the server dropped; retrying. */
  | "reconnecting";

export interface LiveEvent {
  at: string;
  text: string;
  tone: "info" | "warn" | "alert";
}

const SUPPORT_CHOICE_TEXT = {
  continued: "The patient chose to continue the interview",
  break: "The patient chose to take a break",
  ended: "The patient chose to stop for today",
} as const;

/** Support mode: when it starts, each line Amumata says, and the patient's choice. */
function supportEvents(prev: LiveInterviewState, next: LiveInterviewState, at: string): LiveEvent[] {
  const before = prev.support;
  const now = next.support;
  if (!now) return [];
  const events: LiveEvent[] = [];
  if (now.active && !before?.active) {
    events.push({ at, text: "Support mode: Amumata paused the questions and is keeping the patient company", tone: "alert" });
  }
  if (now.lastLine && (now.lineCount ?? 0) > (before?.lineCount ?? 0)) {
    events.push({ at, text: `Amumata said: “${now.lastLine}”`, tone: "info" });
  }
  if (now.choice && now.choice !== before?.choice) events.push({ at, text: SUPPORT_CHOICE_TEXT[now.choice], tone: "warn" });
  return events;
}

/** Events worth showing, from one progress update to the next. */
export function eventsBetween(prev: LiveInterviewState, next: LiveInterviewState, at: string): LiveEvent[] {
  const events: LiveEvent[] = [];
  if (next.stage === "interview" && prev.stage !== "interview") events.push({ at, text: "The interview questions started", tone: "info" });
  if (next.stage === "interview" && prev.stage === "interview" && next.questionIndex !== prev.questionIndex && next.questionIndex !== undefined) {
    events.push({ at, text: `Question ${next.questionIndex + 1}${next.questionTotal ? ` of ${next.questionTotal}` : ""}`, tone: "info" });
  }
  if (next.checkIn && !prev.checkIn) events.push({ at, text: "Amumata checked in: “Okay ka pa ba mopadayon?”", tone: "warn" });
  if (next.onBreak && !prev.onBreak) events.push({ at, text: "The patient is taking a break", tone: "warn" });
  if (!next.onBreak && prev.onBreak) events.push({ at, text: "The patient is back from the break", tone: "info" });
  if (next.crisis && !prev.crisis) events.push({ at, text: "Crisis alert: the patient may be at risk — the help lines were shown", tone: "alert" });
  events.push(...supportEvents(prev, next, at));
  if (next.heldByTherapist && !prev.heldByTherapist) events.push({ at, text: "The questions are paused on the patient's screen", tone: "warn" });
  if (!next.heldByTherapist && prev.heldByTherapist) events.push({ at, text: "The questions resumed on the patient's screen", tone: "info" });
  if (next.cameraOn === false && prev.cameraOn !== false) events.push({ at, text: "The patient turned their camera off", tone: "warn" });
  if (next.micOn === false && prev.micOn !== false) events.push({ at, text: "The patient muted their microphone", tone: "warn" });
  return events;
}

/**
 * Watch a patient's interview live: joins the link's live room as a viewer and
 * receives the patient's camera and microphone over WebRTC, plus their progress.
 * The therapist can step in: pause / resume the questions and send messages;
 * the patient's replies and "seen" confirmations come back here.
 */
export function useLiveWatch(linkId: number) {
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [state, setState] = useState<LiveInterviewState>({});
  const [patientName, setPatientName] = useState("");
  const [media, setMedia] = useState<MediaStream | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [talk, setTalk] = useState<LiveTalkItem[]>([]);
  const [paused, setPaused] = useState(false);
  const stateRef = useRef<LiveInterviewState>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!Number.isInteger(linkId) || typeof WebSocket === "undefined" || typeof RTCPeerConnection === "undefined") return;
    let stopped = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let ws: WebSocket | null = null;
    let pc: RTCPeerConnection | null = null;
    let iceServers: RTCIceServer[] = [];

    const closePeer = () => {
      pc?.close();
      pc = null;
      setMedia(null);
    };
    const send = (message: unknown) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    };
    const applyState = (next: LiveInterviewState) => {
      const at = new Date().toISOString();
      const added = eventsBetween(stateRef.current, next, at);
      stateRef.current = next;
      setState(next);
      if (added.length) setEvents((prev) => [...added.reverse(), ...prev].slice(0, 50));
    };

    // The patient's browser offers its camera + mic; answer it.
    const answerOffer = async (offer: RTCSessionDescriptionInit) => {
      closePeer();
      const peer = new RTCPeerConnection({ iceServers });
      pc = peer;
      peer.ontrack = (e) => setMedia(e.streams[0] ?? new MediaStream([e.track]));
      peer.onicecandidate = (e) => {
        if (e.candidate) send({ type: "signal", data: { candidate: e.candidate.toJSON() } });
      };
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      send({ type: "signal", data: { sdp: peer.localDescription } });
    };

    // Status starts as "connecting"; a dropped connection sets "reconnecting" before retrying.
    const connect = () => {
      const socket = new WebSocket(liveSocketUrl());
      ws = socket;
      wsRef.current = socket;
      socket.onopen = () => {
        retries = 0;
        socket.send(JSON.stringify({ type: "hello", role: "viewer", authToken: localStorage.getItem("user_token"), linkId }));
      };
      socket.onmessage = (event) => {
        let msg: {
          type?: string;
          iceServers?: RTCIceServer[];
          patientOnline?: boolean;
          patientName?: string;
          state?: LiveInterviewState;
          data?: { sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
          talk?: LiveTalkItem[];
          paused?: boolean;
          item?: LiveTalkItem;
          ref?: string;
          seenAt?: string;
        };
        try {
          msg = JSON.parse(event.data as string);
        } catch {
          return;
        }
        if (msg.type === "welcome") {
          iceServers = msg.iceServers ?? [];
          setPatientName(msg.patientName ?? "");
          if (msg.state) applyState(msg.state);
          setStatus(msg.patientOnline ? "live" : "waiting");
          setTalk(Array.isArray(msg.talk) ? msg.talk : []);
          setPaused(Boolean(msg.paused));
        } else if (msg.type === "talk" && msg.item) {
          const item = msg.item;
          setTalk((prev) => mergeTalk(prev, item));
          if (item.kind === "pause") setPaused(true);
          else if (item.kind === "resume") setPaused(false);
        } else if (msg.type === "seen" && msg.ref) {
          const { ref, seenAt = new Date().toISOString() } = msg;
          setTalk((prev) => prev.map((t) => (t.ref === ref ? { ...t, seenAt } : t)));
        } else if (msg.type === "patient-online") {
          setStatus("live");
          setEvents((prev) => [{ at: new Date().toISOString(), text: "The patient entered the interview room", tone: "info" as const }, ...prev]);
        } else if (msg.type === "patient-offline") {
          closePeer();
          setStatus("waiting");
          setEvents((prev) => [{ at: new Date().toISOString(), text: "The patient left the interview room (finished, or closed the page)", tone: "info" as const }, ...prev]);
        } else if (msg.type === "state" && msg.state) {
          applyState(msg.state);
        } else if (msg.type === "signal" && msg.data) {
          if (msg.data.sdp?.type === "offer") void answerOffer(msg.data.sdp).catch(() => closePeer());
          else if (msg.data.candidate && pc) void pc.addIceCandidate(msg.data.candidate).catch(() => {});
        }
      };
      socket.onclose = (event) => {
        closePeer();
        if (ws === socket) ws = null;
        if (wsRef.current === socket) wsRef.current = null;
        if (stopped) return;
        if (event.code === 4403) {
          setStatus("denied");
          return;
        }
        retries += 1;
        setStatus("reconnecting");
        retryTimer = setTimeout(connect, Math.min(10_000, 2_000 * retries));
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      ws?.close();
      pc?.close();
    };
  }, [linkId]);

  /** Send to the live server; false if not connected (nothing was sent). */
  const sendToServer = useCallback((message: unknown): boolean => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);
  const sendTalk = useCallback((body: string) => sendToServer({ type: "talk", body }), [sendToServer]);
  const pause = useCallback(() => sendToServer({ type: "pause" }), [sendToServer]);
  const resume = useCallback(() => sendToServer({ type: "resume" }), [sendToServer]);

  return { status, state, patientName, media, events, talk, paused, sendTalk, pause, resume };
}
