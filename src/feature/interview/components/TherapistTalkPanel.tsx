import { useState } from "react";
import { Send, UserRound } from "lucide-react";
import { TALK_MAX, type LiveTalkItem } from "../../../shared/api/liveApi";
import { TALK_TEXT } from "../hooks/therapistTalk";
import type { ResponseLanguage } from "../hooks/rapportUtils";

interface TherapistTalkPanelProps {
  lang: ResponseLanguage;
  /** The conversation so far (pauses and resumes are not shown as bubbles). */
  talk: readonly LiveTalkItem[];
  /** The questions are held for the therapist right now. */
  paused: boolean;
  large?: boolean;
  /** Send a typed reply; false if it couldn't be sent. */
  onReply: (text: string) => boolean;
}

const SHOWN = 8;

/**
 * The therapist stepped in: their messages (also read aloud) and the patient's
 * replies. A reply shows here only once the server has it, so the patient never
 * sees "sent" for something that wasn't.
 */
export default function TherapistTalkPanel({ lang, talk, paused, large = false, onReply }: TherapistTalkPanelProps) {
  const [draft, setDraft] = useState("");
  const [notSent, setNotSent] = useState(false);
  const messages = talk.filter((t) => t.kind === "message" && t.body).slice(-SHOWN);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    if (onReply(text)) {
      setDraft("");
      setNotSent(false);
    } else {
      setNotSent(true);
    }
  };

  return (
    <section aria-label="Your therapist" className="rounded-2xl border border-emerald-300/40 bg-slate-900/60 p-4 md:p-5">
      <p className="flex items-center gap-2 text-base font-semibold text-emerald-50">
        <UserRound size={18} /> {TALK_TEXT.title[lang]}
      </p>
      {paused && (
        <p role="status" className="mt-1 text-sm text-emerald-200">
          {TALK_TEXT.paused[lang]}
        </p>
      )}

      <ul className="mt-3 space-y-2" aria-live="polite">
        {messages.map((m) => (
          <li key={m.ref} className={m.sender === "patient" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed ${
                m.sender === "patient" ? "bg-teal-700/60 text-teal-50" : "bg-white/10 text-white"
              } ${large ? "text-xl" : "text-base"}`}
            >
              <span className="mb-0.5 block text-[11px] font-medium uppercase tracking-wide opacity-70">
                {m.sender === "patient" ? TALK_TEXT.you[lang] : TALK_TEXT.title[lang]}
              </span>
              {m.body}
            </div>
          </li>
        ))}
      </ul>

      {paused && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-slate-400">{TALK_TEXT.replyHint[lang]}</p>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              maxLength={TALK_MAX}
              placeholder={TALK_TEXT.placeholder[lang]}
              aria-label={TALK_TEXT.placeholder[lang]}
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={!draft.trim()}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
            >
              <Send size={16} /> {TALK_TEXT.send[lang]}
            </button>
          </div>
          {notSent && (
            <p role="alert" className="mt-2 text-xs text-amber-300">
              {TALK_TEXT.notSent[lang]}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
