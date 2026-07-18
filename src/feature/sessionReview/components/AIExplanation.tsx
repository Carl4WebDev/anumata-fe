import { Brain } from "lucide-react";

interface AIExplanationProps {
  explanation: string;
}

export default function AIExplanation({ explanation }: AIExplanationProps) {
  return (
    <div className="flex gap-2 rounded-lg bg-slate-50 p-3" role="note">
      <Brain size={14} className="mt-0.5 shrink-0 text-slate-400" />
      <p className="text-xs leading-relaxed text-slate-600 italic">{explanation}</p>
    </div>
  );
}
