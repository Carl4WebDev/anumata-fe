import { Plus, Trash2, CornerDownRight } from "lucide-react";
import { MAX_QUESTIONS, MIN_QUESTIONS, type DraftQuestion } from "./questionDrafts";

interface QuestionRowsProps {
  questions: DraftQuestion[];
  onChange: (questions: DraftQuestion[]) => void;
}

/** The question list of the Add / Edit forms: each question with an optional follow-up underneath. */
export default function QuestionRows({ questions, onChange }: QuestionRowsProps) {
  const update = (index: number, field: keyof DraftQuestion, value: string) =>
    onChange(questions.map((q, i) => (i === index ? { ...q, [field]: value } : q)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">Questions</label>
        <button
          type="button"
          onClick={() => questions.length < MAX_QUESTIONS && onChange([...questions, { text: "", followUp: "" }])}
          disabled={questions.length >= MAX_QUESTIONS}
          className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline disabled:opacity-40"
        >
          <Plus size={14} />
          Add Question
        </button>
      </div>
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-xs text-slate-400">{i + 1}.</span>
              <input
                type="text"
                value={q.text}
                onChange={(e) => update(i, "text", e.target.value)}
                placeholder={`Question ${i + 1}`}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              {questions.length > MIN_QUESTIONS && (
                <button
                  type="button"
                  onClick={() => onChange(questions.filter((_, j) => j !== i))}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove question ${i + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 pl-8">
              <CornerDownRight size={13} className="shrink-0 text-slate-300" />
              <input
                type="text"
                value={q.followUp}
                onChange={(e) => update(i, "followUp", e.target.value)}
                maxLength={300}
                placeholder="Follow-up (optional), e.g. What did that feel like for you?"
                aria-label={`Follow-up for question ${i + 1}`}
                className="w-full rounded-lg border border-dashed border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Minimum {MIN_QUESTIONS}, maximum {MAX_QUESTIONS} questions. A follow-up is asked once, only when the patient&apos;s answer is short.
      </p>
    </div>
  );
}
