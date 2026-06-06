import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  questionSet: { id: number; name: string; description: string; questions: string[] } | null;
}

export default function ViewQuestionSetModal({ isOpen, onClose, questionSet }: Props) {
  if (!isOpen || !questionSet) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl md:p-8">
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

        <div className="space-y-3">
          {questionSet.questions.map((q, i) => (
            <div
              key={i}
              className="rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4"
            >
              <div className="flex gap-3">
                <span className="shrink-0 text-sm font-bold text-blue-400">{i + 1}.</span>
                <p className="text-sm font-medium text-blue-900">{q}</p>
              </div>
            </div>
          ))}
        </div>

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
