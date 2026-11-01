import { memo, useCallback } from "react";

interface QuestionMiniNavProps {
  questionCount: number;
  spikeIndices: number[];
}

function QuestionMiniNav({ questionCount, spikeIndices }: QuestionMiniNavProps) {
  const scrollTo = useCallback((index: number) => {
    const el = document.getElementById(`question-${index}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <nav
      className="fixed right-4 top-1/2 -translate-y-1/2 z-20 hidden xl:flex flex-col items-center gap-1.5"
      aria-label="Question navigation"
    >
      {Array.from({ length: questionCount }, (_, i) => {
        const isSpike = spikeIndices.includes(i);
        return (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all hover:scale-150 ${
              isSpike
                ? "bg-amber-400 ring-2 ring-amber-200"
                : "bg-slate-300 hover:bg-slate-500"
            }`}
            title={`Question ${i + 1}${isSpike ? " (spike)" : ""}`}
            aria-label={`Jump to question ${i + 1}`}
          />
        );
      })}
    </nav>
  );
}

export default memo(QuestionMiniNav);
