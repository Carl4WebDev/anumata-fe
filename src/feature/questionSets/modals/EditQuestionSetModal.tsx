import { useState, useEffect } from "react";
import { X } from "lucide-react";
import QuestionRows from "./QuestionRows";
import QuestionBankPicker from "./QuestionBankPicker";
import { MAX_QUESTIONS, MIN_QUESTIONS, toQuestionSetData, type DraftQuestion } from "./questionDrafts";
import { questionSetsApi } from "../../../shared/api/questionSetsApi";

type SaveData = { name: string; description: string; questions: string[]; followUps: string[]; sensitives: boolean[] };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Resolves to false when saving failed (the form then stays open). */
  onSave: (data: SaveData) => Promise<boolean> | boolean | void;
  questionSet: {
    id: number;
    name: string;
    description: string;
    questions: string[];
    followUps?: string[];
    sensitives?: boolean[];
    /** Number of questions; a set built from the question bank has them as items, not in `questions`. */
    questionCount?: number;
  } | null;
}

type LoadState = "ready" | "loading" | "failed";

interface SetItem {
  question_text_snapshot: string;
}

const fromTexts = (texts: string[], followUps?: string[], sensitives?: boolean[]): DraftQuestion[] =>
  texts.map((text, i) => ({ text, followUp: followUps?.[i] ?? "", sensitive: sensitives?.[i] === true }));

/** Adds a question in the first empty row, or as a new row. */
function withQuestion(questions: DraftQuestion[], text: string): DraftQuestion[] {
  const empty = questions.findIndex((q) => !q.text.trim());
  if (empty >= 0) return questions.map((q, i) => (i === empty ? { ...q, text } : q));
  return [...questions, { text, followUp: "", sensitive: false }];
}

/** A set built from the question bank keeps its questions as items, loaded separately. */
const isFromBank = (set: Props["questionSet"]) => !!set && set.questions.length === 0 && (set.questionCount ?? 0) > 0;

/**
 * Render with a `key` per set, so the form starts from that set's values each time it opens.
 */
export default function EditQuestionSetModal({ isOpen, onClose, onSave, questionSet }: Props) {
  const [name, setName] = useState(questionSet?.name ?? "");
  const [description, setDescription] = useState(questionSet?.description ?? "");
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    questionSet ? fromTexts(questionSet.questions, questionSet.followUps, questionSet.sensitives) : [],
  );
  const [loadState, setLoadState] = useState<LoadState>(isFromBank(questionSet) ? "loading" : "ready");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bankSetId = isOpen && isFromBank(questionSet) ? questionSet!.id : null;
  useEffect(() => {
    if (bankSetId === null) return;
    let cancelled = false;
    questionSetsApi
      .getItems(bankSetId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as SetItem[] | { data?: SetItem[] };
        const items = Array.isArray(data) ? data : (data.data ?? []);
        setQuestions(fromTexts(items.map((item) => item.question_text_snapshot)));
        setLoadState("ready");
      })
      .catch(() => !cancelled && setLoadState("failed"));
    return () => {
      cancelled = true;
    };
  }, [bankSetId]);

  if (!isOpen || !questionSet) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (loadState !== "ready") return;

    const data = toQuestionSetData(questions);
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    if (data.questions.length < MIN_QUESTIONS) {
      setError(`At least ${MIN_QUESTIONS} questions are required`);
      return;
    }

    setSaving(true);
    const saved = await onSave({ name: name.trim(), description: description.trim(), ...data });
    setSaving(false);
    if (saved !== false) onClose();
  };

  const filled = questions.filter((q) => q.text.trim());
  const canAdd = filled.length < MAX_QUESTIONS;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Edit Question Set</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Family Concerns"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what this template covers"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {loadState === "loading" && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500" role="status">
              Loading this set&apos;s questions…
            </p>
          )}
          {loadState === "failed" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              Couldn&apos;t load this set&apos;s questions, so it can&apos;t be edited right now. Close and try again.
            </p>
          )}
          {loadState === "ready" && (
            <>
              <QuestionRows questions={questions} onChange={setQuestions} />
              <QuestionBankPicker
                existing={filled.map((q) => q.text)}
                canAdd={canAdd}
                onAdd={(text) => setQuestions((prev) => withQuestion(prev, text))}
              />
            </>
          )}

          {error && <p className="text-center text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loadState !== "ready" || saving}
              className="flex-1 rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Update Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
