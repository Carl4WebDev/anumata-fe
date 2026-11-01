import { memo } from "react";

interface Transition {
  from: string;
  to: string;
  fromPct: number;
  toPct: number;
}

interface SessionTransitions {
  sessionId: number;
  sessionLabel: string;
  transitions: Transition[];
}

interface EmotionTransitionHeatmapProps {
  sessions: SessionTransitions[];
  onCellClick?: (sessionId: number) => void;
}

// Color for a transition: based on the "to" emotion
const transitionColor = (from: string, to: string): { bg: string; border: string; text: string } => {
  if (from === to) return { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-500" };
  switch (to) {
    case "happy": return { bg: "bg-green-100", border: "border-green-300", text: "text-green-700" };
    case "sad": return { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700" };
    case "angry": return { bg: "bg-red-100", border: "border-red-300", text: "text-red-700" };
    case "neutral": return { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-500" };
    default: return { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-400" };
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function EmotionTransitionHeatmap({ sessions, onCellClick }: EmotionTransitionHeatmapProps) {
  if (sessions.length === 0) return null;

  // Find max transitions across all sessions for column count
  const maxTransitions = Math.max(...sessions.map((s) => s.transitions.length));
  if (maxTransitions === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Emotion Transition Heatmap</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            How emotions shift between consecutive questions within each session
          </p>
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          {[
            { label: "Same", color: "bg-slate-100 border-slate-200" },
            { label: "To Happy", color: "bg-green-100 border-green-300" },
            { label: "To Sad", color: "bg-blue-100 border-blue-300" },
            { label: "To Angry", color: "bg-red-100 border-red-300" },
            { label: "To Neutral", color: "bg-slate-50 border-slate-200" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded-sm border ${item.color}`} />
              <span className="text-[10px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-medium text-slate-400 uppercase tracking-wider pb-2 pr-3 min-w-[140px]">
                Session
              </th>
              {Array.from({ length: maxTransitions }, (_, i) => (
                <th
                  key={i}
                  className="text-center text-[10px] font-medium text-slate-400 uppercase tracking-wider pb-2 px-1 min-w-[52px]"
                >
                  Q{i + 1}→Q{i + 2}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.sessionId} className="group">
                <td className="pr-3 py-1">
                  <button
                    onClick={() => onCellClick?.(session.sessionId)}
                    className="text-left text-xs text-slate-600 font-medium hover:text-teal-600 transition-colors truncate max-w-[180px]"
                    title={session.sessionLabel}
                  >
                    {session.sessionLabel}
                  </button>
                </td>
                {Array.from({ length: maxTransitions }, (_, i) => {
                  const t = session.transitions[i];
                  if (!t) {
                    return <td key={i} className="px-1 py-1"><div className="w-10 h-10 rounded bg-slate-50 border border-dashed border-slate-200" /></td>;
                  }
                  const colors = transitionColor(t.from, t.to);
                  return (
                    <td key={i} className="px-1 py-1">
                      <div className="relative group/cell">
                        <button
                          onClick={() => onCellClick?.(session.sessionId)}
                          className={`w-10 h-10 rounded border flex items-center justify-center transition-all hover:scale-110 hover:shadow-md cursor-pointer ${colors.bg} ${colors.border}`}
                          title={`Q${i + 1}→Q${i + 2}: ${capitalize(t.from)} → ${capitalize(t.to)}`}
                        >
                          <span className={`text-[9px] font-semibold ${colors.text}`}>
                            {capitalize(t.to).slice(0, 3)}
                          </span>
                        </button>
                        {/* Hover tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/cell:opacity-100 transition-opacity z-10 pointer-events-none">
                          <div className="bg-slate-800 text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                            Q{i + 1}→Q{i + 2}: {capitalize(t.from)} ({t.fromPct}%) → {capitalize(t.to)} ({t.toPct}%)
                          </div>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile legend */}
      <div className="mt-3 flex sm:hidden items-center gap-2 flex-wrap">
        {[
          { label: "Same", color: "bg-slate-100 border-slate-200" },
          { label: "Happy", color: "bg-green-100 border-green-300" },
          { label: "Sad", color: "bg-blue-100 border-blue-300" },
          { label: "Angry", color: "bg-red-100 border-red-300" },
          { label: "Neutral", color: "bg-slate-50 border-slate-200" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm border ${item.color}`} />
            <span className="text-[9px] text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(EmotionTransitionHeatmap);