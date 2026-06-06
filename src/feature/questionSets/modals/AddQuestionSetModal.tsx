import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; questions: string[] }) => void;
}

export default function AddQuestionSetModal({ isOpen, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const addQuestionField = () => {
    if (questions.length < 10) {
      setQuestions([...questions, ""]);
    }
  };

  const removeQuestionField = (index: number) => {
    if (questions.length > 3) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const filled = questions.filter((q) => q.trim());
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }
    if (filled.length < 3) {
      setError("At least 3 questions are required");
      return;
    }

    onSave({ name: name.trim(), description: description.trim(), questions: filled });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setQuestions(["", "", "", "", "", ""]);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl md:p-8">
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
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what this template covers"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Questions</label>
              <button
                type="button"
                onClick={addQuestionField}
                disabled={questions.length >= 10}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline disabled:opacity-40"
              >
                <Plus size={14} />
                Add Question
              </button>
            </div>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-right text-xs text-slate-400">{i + 1}.</span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => updateQuestion(i, e.target.value)}
                    placeholder={`Question ${i + 1}`}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {questions.length > 3 && (
                    <button
                      type="button"
                      onClick={() => removeQuestionField(i)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Minimum 3, maximum 10 questions.</p>
          </div>

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
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
