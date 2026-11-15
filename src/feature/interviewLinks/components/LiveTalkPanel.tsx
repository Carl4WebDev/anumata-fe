import { useState } from "react";
import { Check, CheckCheck, MessageCircleHeart, Pause, Play, Send } from "lucide-react";
import { TALK_MAX, pendingReady, type LiveTalkItem } from "../../../shared/api/liveApi";
import { LANGUAGE_NAME, QUICK_LINES, type TalkLanguage } from "../hooks/liveTalkLines";

interface LiveTalkPanelProps {
  /** Connected to the live server (messages can be sent). */
  connected: boolean;
  /** The patient is in the interview room right now. */
  patientOnline: boolean;
  /** The therapist asked to pause the questions. */
  paused: boolean;
  /** The pause has taken effect on the patient's screen. */
  held: boolean;
  language?: TalkLanguage;
  talk: readonly LiveTalkItem[];
  sendTalk: (body: string) => boolean;
  pause: () => boolean;
  resume: () => boolean;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

/** A pause / resume, as a short line in the conversation. */
function ControlLine({ item }: { item: LiveTalkItem }) {
  const text =
    item.kind === "pause"
      ? "You paused the questions"
      : !item.auto
        ? "You resumed the interview"
        : item.sender === "patient"
          ? "Resumed automatically — the patient was ready and no reply came within 1 minute"
          : "Resumed automatically — you closed the live view";
  return (
    <li className="text-center text-xs text-slate-400">
      {text} · {time(item.at)}
    </li>
  );
}

function Bubble({ item }: { item: LiveTalkItem }) {
  const mine = item.sender === "therapist";
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-800"}`}>
        <p className="whitespace-pre-wrap">{item.body}</p>
        <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-teal-100" : "text-slate-500"}`}>
          {mine ? (
            item.seenAt ? (
              <>
                <CheckCheck size={12} /> Seen {time(item.seenAt)}
              </>
            ) : (
              <>
                <Check size={12} /> Sent {time(item.at)}
              </>
            )
          ) : (
            <>Patient · {time(item.at)}</>
          )}
        </p>
      </div>
    </li>
  );
}

/**
 * The therapist steps in: pause or resume the questions, and message the
 * patient (shown on their screen and read aloud). "Seen" only once the
 * patient's screen confirms it. Sending a message pauses the questions first.
 */
export default function LiveTalkPanel({ connected, patientOnline, paused, held, language = "en", talk, sendTalk, pause, resume }: LiveTalkPanelProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const fail = () => setError("Not connected — nothing was sent. Please try again in a moment.");

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    // The patient shouldn't have to answer a question and read a message at once.
    if (!paused && !pause()) return fail();
    if (!sendTalk(text)) return fail();
    setDraft("");
    setError("");
  };
  const togglePause = () => {
    if (!(paused ? resume() : pause())) fail();
    else setError("");
  };

  const ready = paused ? pendingReady(talk) : null;
  const status = !patientOnline
    ? "The patient isn't in the interview room. Messages are kept and shown when they return."
    : paused
      ? held
        ? "The questions are paused on the patient's screen. They can reply by speaking or typing."
        : "Pausing… the questions will pause once the patient's screen catches up."
      : "The interview is running. Sending a message pauses the questions first.";

  return (
    <section aria-label="Talk to the patient" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <MessageCircleHeart size={16} className="text-teal-600" /> Talk to the patient
        </h2>
        <button
          onClick={togglePause}
          disabled={!connected}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-40 ${
            paused ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-amber-100 text-amber-900 hover:bg-amber-200"
          }`}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
          {paused ? "Resume interview" : "Pause questions"}
        </button>
      </div>
      <p role="status" className={`mt-2 text-xs ${paused && held ? "font-medium text-amber-700" : "text-slate-500"}`}>
        {status}
      </p>

      {ready && (
        <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-teal-900">The patient is ready to continue</p>
            <p className="text-xs text-teal-800">
              {ready.resumeAt
                ? `The interview resumes by itself at ${time(ready.resumeAt)} unless you resume or reply.`
                : "Resume, or reply to keep talking."}
            </p>
          </div>
          <button
            onClick={togglePause}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Play size={15} /> Resume now
          </button>
        </div>
      )}

      {talk.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto" aria-label="Conversation">
          {talk.map((t) => (t.kind === "message" ? <Bubble key={t.ref} item={t} /> : <ControlLine key={t.ref} item={t} />))}
        </ul>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-xs text-slate-500">Quick lines ({LANGUAGE_NAME[language]}) — tap to put in the box:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_LINES.map((q) => (
            <button
              key={q.label}
              onClick={() => setDraft(q.text[language])}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:border-teal-400 hover:bg-teal-50"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={TALK_MAX}
          rows={2}
          placeholder="Write to the patient — Amumata shows it and reads it aloud."
          aria-label="Message to the patient"
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-slate-400">
            {draft.length}/{TALK_MAX}
          </span>
          <button
            onClick={send}
            disabled={!connected || !draft.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-40"
          >
            <Send size={15} /> Send
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">The conversation is saved with the session. The patient's replies aren't part of the emotion analysis.</p>
      </div>
    </section>
  );
}
