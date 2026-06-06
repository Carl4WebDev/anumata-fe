import { useState } from "react";
import { Plus, Eye, Trash2, Search } from "lucide-react";
import { useQuestionSets } from "../../context/questionSets/useQuestionSets";
import AddQuestionSetModal from "../modals/AddQuestionSetModal";
import ViewQuestionSetModal from "../modals/ViewQuestionSetModal";

export default function QuestionSetsPage() {
  const { questionSets, addQuestionSet, removeQuestionSet } = useQuestionSets();
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewSet, setViewSet] = useState<{ id: number; name: string; description: string; questions: string[] } | null>(null);

  const filtered = questionSets.filter((qs) =>
    qs.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Question Sets</h1>
          <p className="mt-1 text-sm text-slate-500">Therapist-approved interview templates.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Template
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="shrink-0 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates..."
          className="w-full text-sm outline-none"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((qs) => (
          <div
            key={qs.id}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6"
          >
            <div className="mb-3 flex items-start justify-between">
              <h2 className="text-base font-semibold text-slate-900">{qs.name}</h2>
              <button
                onClick={() => removeQuestionSet(qs.id)}
                className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                title="Delete template"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <p className="mb-4 text-sm leading-relaxed text-slate-500">{qs.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{qs.questions.length} questions</span>
              <button
                onClick={() => setViewSet(qs)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
              >
                <Eye size={14} />
                View
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-sm text-slate-400">No templates found.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddQuestionSetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addQuestionSet}
      />
      <ViewQuestionSetModal
        isOpen={!!viewSet}
        onClose={() => setViewSet(null)}
        questionSet={viewSet}
      />
    </div>
  );
}
