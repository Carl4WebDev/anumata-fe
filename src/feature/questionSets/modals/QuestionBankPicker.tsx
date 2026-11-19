import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Plus, Search } from "lucide-react";
import { getStandardizedQuestions, type StandardizedQuestion } from "../../../shared/api/standardizedQuestionsApi";

interface QuestionBankPickerProps {
  /** Question texts already in the set (shown as added). */
  existing: string[];
  /** False when the set is full. */
  canAdd: boolean;
  onAdd: (text: string) => void;
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Search the standardized question bank and add questions to the set being edited. */
export default function QuestionBankPicker({ existing, canAdd, onAdd }: QuestionBankPickerProps) {
  const [open, setOpen] = useState(false);
  const [bank, setBank] = useState<StandardizedQuestion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || bank) return;
    let cancelled = false;
    getStandardizedQuestions()
      .then((questions) => !cancelled && setBank(questions))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [open, bank]);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (bank ?? []).filter(
      (q) => !term || q.text.toLowerCase().includes(term) || q.category.toLowerCase().includes(term) || q.question_code.toLowerCase().includes(term),
    );
  }, [bank, search]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:underline"
      >
        <BookOpen size={14} />
        Add from question bank
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Question bank</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">
          Done
        </button>
      </div>
      <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <Search size={14} className="shrink-0 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by words or topic, e.g. sleep, family"
          aria-label="Search the question bank"
          className="w-full text-sm outline-none"
        />
      </div>
      {!canAdd && <p className="mb-2 text-xs text-amber-700">This set is full. Remove a question to add another.</p>}
      {failed ? (
        <p className="text-xs text-red-600">Couldn&apos;t load the question bank. Please try again.</p>
      ) : !bank ? (
        <p className="text-xs text-slate-500" role="status">Loading questions…</p>
      ) : (
        <ul className="max-h-56 space-y-1 overflow-y-auto">
          {matches.length === 0 && <li className="text-xs text-slate-500">No questions match.</li>}
          {matches.map((q) => {
            const added = existing.some((text) => sameText(text, q.text));
            return (
              <li key={q.id}>
                <button
                  type="button"
                  disabled={added || !canAdd}
                  onClick={() => onAdd(q.text)}
                  aria-label={added ? `Added: ${q.text}` : `Add: ${q.text}`}
                  className="flex w-full items-start gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-white"
                >
                  {added ? <Check size={14} className="mt-0.5 shrink-0 text-teal-600" /> : <Plus size={14} className="mt-0.5 shrink-0 text-teal-600" />}
                  <span className="flex-1">{q.text}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">{q.category}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
