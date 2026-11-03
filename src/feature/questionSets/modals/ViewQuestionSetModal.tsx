import { useState, useEffect } from "react";
import { X, CornerDownRight } from "lucide-react";
import { questionSetsApi } from "../../../shared/api/questionSetsApi";
import { Skeleton } from "../../../shared/components/Skeleton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  questionSet: {
    id: number;
    name: string;
    description: string;
    questions: string[];
    followUps?: string[];
    questionCount?: number;
  } | null;
}

interface QuestionSetItem {
  id: number;
  source_type: string;
  question_text_snapshot: string;
  display_order: number;
  question_code?: string;
  sq_category?: string;
}

export default function ViewQuestionSetModal({ isOpen, onClose, questionSet }: Props) {
  const [items, setItems] = useState<QuestionSetItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !questionSet) {
      setItems([]);
      return;
    }

    // If the set has items (from question_set_items), fetch them
    const count = questionSet.questionCount ?? questionSet.questions.length;
    if (count > 0 && questionSet.questions.length === 0) {
      setLoading(true);
      questionSetsApi.getItems(questionSet.id)
        .then((res: any) => {
          const data = Array.isArray(res.data) ? res.data : res.data?.data;
          setItems(data || []);
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, questionSet]);

  if (!isOpen || !questionSet) return null;

  // Determine which questions to display
  const hasItems = items.length > 0;
  const displayQuestions = hasItems
    ? items.map((item) => ({
        text: item.question_text_snapshot,
        code: item.question_code,
        category: item.sq_category,
        source: item.source_type,
        followUp: undefined as string | undefined,
      }))
    : questionSet.questions.map((q, i) => ({
        text: q,
        code: undefined,
        category: undefined,
        source: "legacy",
        followUp: questionSet.followUps?.[i] || undefined,
      }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{questionSet.name}</h2>
            {questionSet.description && (
              <p className="mt-1 text-sm text-slate-500">{questionSet.description}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3" role="status">
            <span className="sr-only">Loading questions…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border-l-4 border-slate-200 bg-slate-50 p-4">
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayQuestions.map((q, i) => (
              <div
                key={i}
                className="rounded-xl border-l-4 border-teal-500 bg-teal-50 p-4"
              >
                <div className="flex gap-3">
                  <span className="shrink-0 text-sm font-bold text-teal-500">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-teal-900">{q.text}</p>
                    {q.followUp && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-teal-700/80">
                        <CornerDownRight size={12} className="mt-0.5 shrink-0" />
                        <span>
                          <span className="font-medium">Follow-up:</span> {q.followUp}
                        </span>
                      </p>
                    )}
                    {q.code && (
                      <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">{q.code}</span>
                    )}
                    {q.source === "standardized" && (
                      <span className="ml-1 mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600">Standardized</span>
                    )}
                    {q.source === "custom" && (
                      <span className="ml-1 mt-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-600">Custom</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {displayQuestions.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">No questions in this set.</p>
            )}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}