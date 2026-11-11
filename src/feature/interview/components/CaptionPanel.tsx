import { useEffect, useRef } from "react";
import { Captions } from "lucide-react";
import type { CaptionEngine, CaptionSegment } from "../hooks/useLiveCaptions";
import { languageLabel } from "../hooks/rapportUtils";
import VoiceLevel from "./VoiceLevel";

interface CaptionPanelProps {
  segments: CaptionSegment[];
  /** Words being spoken right now, not final yet. */
  interim?: string;
  engine?: CaptionEngine;
  listening: boolean;
  voiceActive: boolean;
  getLevel: () => number;
  /** Shown before the patient has said anything this turn. */
  placeholder: string;
  /** Patient chose "Larger text". */
  largeText?: boolean;
}

/** Live caption of what the patient is saying in the current turn. */
export default function CaptionPanel({
  segments,
  interim = "",
  engine = "whisper",
  listening,
  voiceActive,
  getLevel,
  placeholder,
  largeText = false,
}: CaptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const spoken = segments.filter((s) => s.status !== "failed");
  const lastLanguage = [...spoken].reverse().find((s) => s.status === "done" && s.language)?.language;
  const hasText = spoken.length > 0 || interim.length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === "function") el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [segments, interim]);

  return (
    // Fills the free space but never shrinks below a readable height: when the
    // column is full it scrolls instead, so nothing below can draw over the caption.
    <div
      className={`flex shrink-0 grow basis-0 flex-col rounded-2xl border border-white/10 bg-white/5 ${largeText ? "min-h-56" : "min-h-44"}`}
      data-testid="caption-panel"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          <Captions size={14} /> Live caption
        </span>
        <div className="flex items-center gap-3">
          {lastLanguage && <span className="text-xs text-slate-500">{languageLabel(lastLanguage)}</span>}
          <VoiceLevel getLevel={getLevel} active={listening} />
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        {!hasText ? (
          <p className={`${largeText ? "text-lg" : "text-sm"} italic text-slate-500`}>{voiceActive ? "Listening…" : placeholder}</p>
        ) : (
          <p className={`${largeText ? "text-2xl md:text-3xl" : "text-lg"} leading-relaxed text-white`}>
            {spoken.map((s) =>
              s.status === "pending" ? (
                <span key={s.id} className="inline-flex gap-1 align-middle" aria-label="Transcribing">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400" style={{ animationDelay: `${i * 120}ms` }} />
                  ))}{" "}
                </span>
              ) : (
                <span key={s.id}>{s.text} </span>
              ),
            )}
            {interim && <span className="text-slate-400">{interim}</span>}
            {voiceActive && <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-teal-400 align-middle" />}
          </p>
        )}
      </div>
      {engine === "whisper" && (
        <p className="border-t border-white/10 px-4 py-1.5 text-[11px] text-slate-500">
          Captions appear after each phrase — keep talking naturally.
        </p>
      )}
    </div>
  );
}
