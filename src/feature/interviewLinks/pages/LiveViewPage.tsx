import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Coffee, Loader2, MessageSquare, Radio, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { useLiveWatch, type LiveEvent, type LiveStatus } from "../hooks/useLiveWatch";

const STATUS_TEXT: Record<LiveStatus, string> = {
  connecting: "Connecting…",
  waiting: "Waiting for the patient to open the interview…",
  live: "Live",
  denied: "You can't watch this interview — it isn't one of yours, or your login expired.",
  reconnecting: "Connection lost — reconnecting…",
};

const EVENT_TONE: Record<LiveEvent["tone"], string> = {
  info: "text-slate-600",
  warn: "text-amber-700",
  alert: "font-semibold text-red-700",
};

/**
 * Watch a patient's interview as it happens: their camera and microphone,
 * the current question, live captions, and events like check-ins and breaks.
 * The therapist is invisible and silent to the patient.
 */
export default function LiveViewPage() {
  const { id } = useParams();
  const linkId = Number(id);
  const { status, state, patientName, media, events } = useLiveWatch(linkId);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Browsers only autoplay muted video; sound needs one click.
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== media) video.srcObject = media;
    if (media) void video.play?.().catch(() => {});
  }, [media]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const live = status === "live";
  const inQuestions = state.stage === "interview" && state.questionIndex !== undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/interview-links" className="rounded-lg p-2 text-slate-500 hover:bg-white" aria-label="Back to interview links">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{patientName ? `Watching ${patientName}` : "Live interview"}</h1>
            <p className="text-sm text-slate-500">The patient can't see or hear you.</p>
          </div>
        </div>
        <span
          role="status"
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
            live ? "bg-red-50 text-red-700" : status === "denied" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"
          }`}
        >
          {live ? <Radio size={15} className="animate-pulse" /> : status === "denied" ? null : <Loader2 size={15} className="animate-spin" />}
          {STATUS_TEXT[status]}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Video */}
        <section className="lg:col-span-2">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900">
            <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-contain ${media ? "" : "hidden"}`} aria-label="Patient's camera" />
            {!media && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-slate-300">
                {live ? <Loader2 size={28} className="animate-spin" /> : <VideoOff size={28} />}
                <p className="text-sm">
                  {live
                    ? "Connecting to the patient's camera…"
                    : status === "denied"
                      ? "Live viewing isn't available for this interview."
                      : "The video appears here when the patient is in the interview room."}
                </p>
              </div>
            )}
            {media && (
              <button
                onClick={() => setMuted((m) => !m)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white backdrop-blur hover:bg-black/75"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {muted ? "Unmute" : "Mute"}
              </button>
            )}
            {live && state.cameraOn === false && (
              <p className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                <VideoOff size={13} /> Camera turned off by the patient
              </p>
            )}
          </div>

          {/* Current question and what the patient is saying */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
              {inQuestions
                ? `Question ${state.questionIndex! + 1}${state.questionTotal ? ` of ${state.questionTotal}` : ""}`
                : state.stage === "warmup"
                  ? "Warm-up conversation"
                  : "Not started yet"}
            </p>
            {inQuestions && state.question && <p className="mt-1 text-lg font-medium text-slate-900">{state.question}</p>}
            {state.onBreak && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-sky-700">
                <Coffee size={15} /> On a break
              </p>
            )}
            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <MessageSquare size={13} /> Live caption
              </p>
              <p className="min-h-6 text-sm text-slate-800" aria-live="polite">
                {state.caption || <span className="italic text-slate-400">Nothing said yet for this question.</span>}
              </p>
              {(state.captionGaps ?? 0) > 0 && (
                <p className="mt-1.5 text-xs italic text-amber-700">
                  {state.captionGaps === 1
                    ? "(1 phrase couldn't be transcribed — speech-to-text was busy. Listen with sound on.)"
                    : `(${state.captionGaps} phrases couldn't be transcribed — speech-to-text was busy. Listen with sound on.)`}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Events */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <Video size={16} className="text-teal-600" /> What's happening
          </h2>
          {state.crisis && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> Crisis alert — the patient may be at risk. Please contact them.
            </p>
          )}
          {events.length === 0 ? (
            <p className="text-sm text-slate-500">Check-ins, breaks and questions will appear here as they happen.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {events.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex gap-2">
                  <span className="shrink-0 tabular-nums text-xs text-slate-400">
                    {new Date(e.at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className={EVENT_TONE[e.tone]}>{e.text}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
            Live viewing isn't recorded. The AI analysis runs after the interview, as usual.
          </p>
        </aside>
      </div>
    </div>
  );
}
