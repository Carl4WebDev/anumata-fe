import { useState } from "react";
import { X } from "lucide-react";
import QuestionRows from "./QuestionRows";
import { MIN_QUESTIONS, emptyQuestions, toQuestionSetData, type DraftQuestion } from "./questionDrafts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; questions: string[]; followUps: string[]; sensitives: boolean[] }) => void;
}

export default function AddQuestionSetModal({ isOpen, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>(() => emptyQuestions(6));
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const data = toQuestionSetData(questions);
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    if (data.questions.length < MIN_QUESTIONS) {
      setError(`At least ${MIN_QUESTIONS} questions are required`);
      return;
    }

    onSave({ name: name.trim(), description: description.trim(), ...data });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setQuestions(emptyQuestions(6));
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">New Question Template</h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
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

          <QuestionRows questions={questions} onChange={setQuestions} />

          {error && <p className="text-center text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
