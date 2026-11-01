import { memo } from "react";

interface ConfidenceBadgeProps {
  value: number;
  label?: string;
}

function ConfidenceBadge({ value, label }: ConfidenceBadgeProps) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70
      ? "bg-emerald-100 text-emerald-700"
      : pct >= 40
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label && <span className="opacity-70">{label}</span>}
      {pct}%
    </span>
  );
}

export default memo(ConfidenceBadge);
