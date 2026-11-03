import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ReactNode } from "react";

/** "+20 pts vs usual" — highlighted when the change reaches `threshold`. */
export function Change({ value, unit, threshold }: { value: number | null | undefined; unit: string; threshold: number }) {
  if (value == null) return null;
  const up = value >= threshold;
  const down = value <= -threshold;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-0.5 ${up || down ? "text-amber-700" : "text-slate-400"}`}>
      <Icon size={10} />
      {sign}
      {value}
      {unit} vs usual
    </span>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 py-1">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-right text-[11px] text-slate-700">{children}</dd>
    </div>
  );
}

const TONES = {
  cyan: { box: "border-cyan-100 bg-cyan-50/40", title: "text-cyan-800", divide: "divide-cyan-100/70" },
  violet: { box: "border-violet-100 bg-violet-50/40", title: "text-violet-800", divide: "divide-violet-100/70" },
  orange: { box: "border-orange-100 bg-orange-50/40", title: "text-orange-800", divide: "divide-orange-100/70" },
} as const;

/** The "Measured in this answer" box shared by the voice, face and word cards. */
export function MeasuredBox({ tone, note, children }: { tone: keyof typeof TONES; note: string; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <div className={`mt-2.5 rounded-lg border px-2.5 py-1.5 ${t.box}`}>
      <p className={`text-[11px] font-medium ${t.title}`}>Measured in this answer</p>
      <dl className={`divide-y ${t.divide}`}>{children}</dl>
      <p className="mt-1 text-[10px] italic text-slate-400">{note}</p>
    </div>
  );
}
