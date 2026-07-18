import { StickyNote } from "lucide-react";

interface PerQuestionNotesProps {
  value: string;
  onChange: (text: string) => void;
}

export default function PerQuestionNotes({ value, onChange }: PerQuestionNotesProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <StickyNote size={14} className="text-slate-400" />
        <span className="text-xs font-medium text-slate-500">Private Therapist Notes</span>
        {value.length > 0 && (
          <span className="ml-auto text-[10px] text-slate-400">{value.length} chars</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add private notes for this question..."
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 focus:outline-none"
        aria-label="Private therapist notes for this question"
      />
    </div>
  );
}
