import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Send, ShieldCheck, Sparkles, Square } from "lucide-react";
import { adminApi } from "../../../shared/api/adminApi";
import { ApiError } from "../../../shared/api/httpClient";
import { buildKnowledge } from "../data/assistantKnowledge";
import { searchKnowledge, toPassages } from "../utils/searchKnowledge";
import type { AssistantTurn } from "../utils/assistantTurns";
import { useVoiceQuestion, type VoiceMode } from "../hooks/useVoiceQuestion";
import AssistantTurnCard from "./AssistantTurnCard";

const MAX_QUESTION = 500;
const MATCHES_SHOWN = 5;
/** After this long without an answer, say the AI is probably waking up. */
const WAKING_HINT_MS = 10000;
const NOT_DOCUMENTED = "That isn't covered in Amumata's documentation yet.";

const VOICE_STATUS: Record<VoiceMode, string> = {
  idle: "",
  listening: "Listening… ask your question in English.",
  recording: "Recording… tap the square to stop.",
  transcribing: "Turning your voice into text…",
};

const EXAMPLES = ["Why did the voice accuracy drop?", "How are face and voice combined?", "How is the patient's privacy protected?"];

/** Ask Amumata: questions about the system, answered by the AI from Amumata's own info pages. */
export default function AskAmumata() {
  const knowledge = useMemo(() => buildKnowledge(), []);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [waking, setWaking] = useState(false);
  const nextId = useRef(1);
  const voice = useVoiceQuestion(useCallback((text: string) => setQuestion(text.slice(0, MAX_QUESTION)), []));
  const thinking = turns.some((t) => t.status === "thinking");

  useEffect(() => {
    if (!thinking) return;
    const timer = setTimeout(() => setWaking(true), WAKING_HINT_MS);
    return () => {
      clearTimeout(timer);
      setWaking(false);
    };
  }, [thinking]);

  const update = (id: number, patch: Partial<AssistantTurn>) =>
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;
    const found = searchKnowledge(knowledge, q, MATCHES_SHOWN);
    const matches = found.map((m) => m.entry);
    const passages = toPassages(found);
    const id = nextId.current++;
    setQuestion("");
    if (passages.length === 0) {
      setTurns((prev) => [{ id, question: q, matches, status: "answered", answer: NOT_DOCUMENTED, found: false }, ...prev]);
      return;
    }
    setTurns((prev) => [{ id, question: q, matches, status: "thinking" }, ...prev]);
    try {
      const res = await adminApi.askAssistant(q, passages.map(({ source, title, text: body }) => ({ source, title, text: body })));
      update(id, { status: "answered", ...res.data });
    } catch (err) {
      update(id, { status: "failed", error: err instanceof ApiError ? err.message : "The AI couldn't answer right now. The matching entries are shown below." });
    }
  };

  const listening = voice.mode === "listening" || voice.mode === "recording";

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-label="Ask Amumata">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-teal-600" />
          <h2 className="text-base font-semibold text-slate-900">Ask Amumata</h2>
        </div>
        <p className="text-sm text-slate-500">
          Ask about how Amumata works — the AI models, results, privacy, updates. Type or tap the microphone (English). Answers come only from
          Amumata's own documentation.
        </p>
        <p className="flex items-start gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-900">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" />
          Don't type patient names or details here. Questions aren't saved.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(question);
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, MAX_QUESTION))}
            placeholder="e.g. Why did the voice accuracy drop?"
            aria-label="Your question"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
          />
          <button
            type="button"
            onClick={listening ? voice.stop : voice.start}
            disabled={voice.mode === "transcribing"}
            aria-label={listening ? "Stop listening" : "Ask by voice"}
            className={`rounded-lg px-3 text-white shadow-sm disabled:opacity-50 ${listening ? "bg-red-500 hover:bg-red-600" : "bg-slate-700 hover:bg-slate-800"}`}
          >
            {voice.mode === "transcribing" ? <Loader2 size={18} className="animate-spin" /> : listening ? <Square size={18} /> : <Mic size={18} />}
          </button>
          <button
            type="submit"
            disabled={!question.trim() || thinking}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
          >
            <Send size={16} /> Ask
          </button>
        </form>
        {(VOICE_STATUS[voice.mode] || voice.error) && (
          <p className={`text-xs ${voice.error ? "text-amber-700" : "text-slate-500"}`} role="status">
            {voice.error ?? VOICE_STATUS[voice.mode]}
          </p>
        )}

        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void ask(example)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200"
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </section>

      {turns.map((turn) => (
        <AssistantTurnCard key={turn.id} turn={turn} waking={waking && turn.status === "thinking"} />
      ))}
    </div>
  );
}
