import { useState, useEffect, useMemo } from "react";
import { Plus, Eye, Trash2, Search, Pencil, Sparkles, BookOpen, Layers, Check, X, Languages } from "lucide-react";
import { useQuestionSets } from "../../context/questionSets/useQuestionSets";
import AddQuestionSetModal from "../modals/AddQuestionSetModal";
import EditQuestionSetModal from "../modals/EditQuestionSetModal";
import ViewQuestionSetModal from "../modals/ViewQuestionSetModal";
import TranslationsModal from "../modals/TranslationsModal";
import AiQuestionSetBuilderModal from "../modals/AiQuestionSetBuilderModal";
import { ListPageSkeleton, RowsSkeleton } from "../../../shared/components/Skeleton";
import EmptyState from "../../../shared/components/EmptyState";
import { useToast } from "../../../shared/context/ToastContext";
import {
  getStandardizedQuestions,
  type StandardizedQuestion,
} from "../../../shared/api/standardizedQuestionsApi";
type Tab = "standardized" | "sets";

/** A question set as listed (sets built from the question bank keep their questions as items). */
interface SetSummary {
  id: number;
  name: string;
  description: string;
  questions: string[];
  followUps?: string[];
  sensitives?: boolean[];
  questionCount?: number;
}

interface SelectedQuestion {
  source_type: "standardized" | "custom";
  id: number;
  text: string;
  code?: string;
  category?: string;
}

export default function QuestionSetsPage() {
  const { questionSets, addQuestionSet, addQuestionSetWithItems, updateQuestionSet, removeQuestionSet, loading, error } = useQuestionSets();
  const { success, error: toastError } = useToast();

  const [tab, setTab] = useState<Tab>("sets");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [editSet, setEditSet] = useState<SetSummary | null>(null);
  const [viewSet, setViewSet] = useState<SetSummary | null>(null);
  const [translationsSet, setTranslationsSet] = useState<{ id: number; name: string } | null>(null);

  // Standardized questions state
  const [standardizedQuestions, setStandardizedQuestions] = useState<StandardizedQuestion[] | null>(null);

  // Selection state (cross-tab)
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [showSetNameModal, setShowSetNameModal] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Load standardized questions (once, the first time the tab is opened)
  const sqLoading = tab === "standardized" && standardizedQuestions === null;
  useEffect(() => {
    if (!sqLoading) return;
    let cancelled = false;
    getStandardizedQuestions()
      .then((data) => !cancelled && setStandardizedQuestions(data || []))
      .catch(() => !cancelled && setStandardizedQuestions([]));
    return () => {
      cancelled = true;
    };
  }, [sqLoading]);

  // Categories from standardized questions
  const categories = useMemo(() => {
    const cats = new Set((standardizedQuestions || []).map((q) => q.category));
    return Array.from(cats).sort();
  }, [standardizedQuestions]);

  // Filter standardized questions
  const filteredSq = useMemo(() => {
    return (standardizedQuestions || []).filter((q) => {
      const matchesSearch = !search || q.text.toLowerCase().includes(search.toLowerCase()) || q.question_code.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || q.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [standardizedQuestions, search, categoryFilter]);

  // Filter question sets
  const filteredSets = useMemo(() => {
    return (questionSets || []).filter((qs) =>
      qs.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [questionSets, search]);

  // Selection helpers
  const isSelected = (sourceType: "standardized" | "custom", id: number) =>
    selectedQuestions.some((q) => q.source_type === sourceType && q.id === id);

  const toggleQuestion = (q: SelectedQuestion) => {
    setSelectedQuestions((prev) => {
      const exists = prev.some((s) => s.source_type === q.source_type && s.id === q.id);
      if (exists) return prev.filter((s) => !(s.source_type === q.source_type && s.id === q.id));
      return [...prev, q];
    });
  };

  const removeSelected = (sourceType: "standardized" | "custom", id: number) => {
    setSelectedQuestions((prev) => prev.filter((s) => !(s.source_type === sourceType && s.id === id)));
  };

  const clearSelection = () => setSelectedQuestions([]);

  // Create interview set from selected questions
  const handleCreateSetFromSelection = async () => {
    if (!newSetName.trim() || selectedQuestions.length === 0) return;
    setCreating(true);
    // Goes through the shared list, so the new set shows on the Sets tab without a refresh.
    const result = await addQuestionSetWithItems({
      name: newSetName.trim(),
      description: newSetDescription.trim() || undefined,
      items: selectedQuestions.map((q) => ({
        source_type: q.source_type,
        ...(q.source_type === "standardized"
          ? { standardized_question_id: q.id }
          : { custom_question_id: q.id }),
      })),
    });
    setCreating(false);
    if (!result.ok) {
      toastError(result.message || "Failed to create interview set.");
      return;
    }
    success(`Interview set "${newSetName}" created with ${selectedQuestions.length} questions.`);
    setSelectedQuestions([]);
    setNewSetName("");
    setNewSetDescription("");
    setShowSetNameModal(false);
    setTab("sets");
  };

  // Question set handlers
  const handleDeleteSet = async (id: number, name: string) => {
    if (await removeQuestionSet(id)) success(`"${name}" deleted.`);
  };

  const handleSave = async (data: Parameters<typeof addQuestionSet>[0]) => {
    await addQuestionSet(data);
    success("Template created.");
    setShowAddModal(false);
  };

  const handleEditSave = async (data: Parameters<typeof addQuestionSet>[0]) => {
    if (!editSet) return false;
    const result = await updateQuestionSet(editSet.id, data);
    if (!result.ok) {
      toastError(result.message);
      return false;
    }
    success("Template updated.");
    return true;
  };

  if (loading) {
    return <ListPageSkeleton label="Loading templates…" />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Question Sets</h1>
          <p className="mt-1 text-sm text-slate-500">Select questions from the standardized bank, write your own, or let the AI help to build interview sets.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            <Sparkles size={18} />
            AI Generate
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Plus size={18} />
            New Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {([
          { id: "standardized" as Tab, label: "Standardized Questions", icon: BookOpen },
          { id: "sets" as Tab, label: "My Interview Question Sets", icon: Layers },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setSearch(""); setCategoryFilter(""); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ").pop()}</span>
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Selection bar */}
      {selectedQuestions.length > 0 && (
        <div className="sticky top-2 z-20 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-teal-600" />
            <span className="text-sm font-medium text-teal-800">
              {selectedQuestions.length} question{selectedQuestions.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {selectedQuestions.slice(0, 5).map((q) => (
              <span key={`${q.source_type}-${q.id}`} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 border border-slate-200">
                {q.code || (q.source_type === "standardized" ? "SQ" : "CQ")}
                <button onClick={() => removeSelected(q.source_type, q.id)} className="ml-0.5 text-slate-400 hover:text-red-500">
                  <X size={10} />
                </button>
              </span>
            ))}
            {selectedQuestions.length > 5 && (
              <span className="text-[11px] text-slate-400">+{selectedQuestions.length - 5} more</span>
            )}
          </div>
          <button
            onClick={() => setShowSetNameModal(true)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Create Interview Set
          </button>
          <button onClick={clearSelection} className="text-sm text-slate-500 hover:text-slate-700">
            Clear
          </button>
        </div>
      )}

      {/* Search + Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "standardized" ? "Search standardized questions..." : "Search templates..."}
            aria-label="Search"
            className="w-full text-sm outline-none"
          />
        </div>
        {tab === "standardized" && categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm outline-none"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tab Content */}
      {tab === "standardized" && (
        <StandardizedQuestionsTab
          questions={filteredSq}
          loading={sqLoading}
          search={search}
          selectedQuestions={selectedQuestions}
          onToggle={toggleQuestion}
          onToggleCategory={(_category, questions) => {
            const allSelected = questions.every((q) => isSelected("standardized", q.id));
            if (allSelected) {
              // Deselect all in category
              setSelectedQuestions((prev) => prev.filter((s) => !(s.source_type === "standardized" && questions.some((q) => q.id === s.id))));
            } else {
              // Select all in category (add missing)
              setSelectedQuestions((prev) => {
                const newItems: SelectedQuestion[] = [...prev];
                for (const q of questions) {
                  if (!newItems.some((s) => s.source_type === "standardized" && s.id === q.id)) {
                    newItems.push({ source_type: "standardized", id: q.id, text: q.text, code: q.question_code, category: q.category });
                  }
                }
                return newItems;
              });
            }
          }}
        />
      )}

      {tab === "sets" && (
        <InterviewSetsTab
          sets={filteredSets}
          search={search}
          onDelete={handleDeleteSet}
          onEdit={setEditSet}
          onView={setViewSet}
          onTranslations={setTranslationsSet}
        />
      )}

      {/* Modals */}
      <AddQuestionSetModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSave}
      />
      {/* Saves on its own ("Approve & Save") */}
      <AiQuestionSetBuilderModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} />
      <EditQuestionSetModal
        key={editSet?.id ?? "closed"}
        isOpen={!!editSet}
        onClose={() => setEditSet(null)}
        onSave={handleEditSave}
        questionSet={editSet}
      />
      <ViewQuestionSetModal
        isOpen={!!viewSet}
        onClose={() => setViewSet(null)}
        questionSet={viewSet}
      />
      <TranslationsModal key={translationsSet?.id ?? "none"} questionSet={translationsSet} onClose={() => setTranslationsSet(null)} />

      {/* Create Interview Set from Selection Modal */}
      {showSetNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Create Interview Set</h2>
            <p className="mb-4 text-sm text-slate-500">
              {selectedQuestions.length} question{selectedQuestions.length !== 1 ? "s" : ""} selected from the question bank.
            </p>

            {/* Selected questions preview */}
            <div className="mb-4 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
              {selectedQuestions.map((q, i) => (
                <div key={`${q.source_type}-${q.id}`} className="flex items-center gap-2 py-1 text-xs text-slate-600">
                  <span className="w-5 text-right text-slate-400">{i + 1}.</span>
                  <span className="truncate flex-1">{q.text}</span>
                  <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">
                    {q.source_type === "standardized" ? q.code : "Custom"}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Set Name *</label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="e.g., Initial Assessment - Standard"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={newSetDescription}
                  onChange={(e) => setNewSetDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setShowSetNameModal(false); setNewSetName(""); setNewSetDescription(""); }}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSetFromSelection}
                disabled={!newSetName.trim() || creating}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Set"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Standardized Questions Tab
// =============================================================================

function StandardizedQuestionsTab({
  questions,
  loading,
  search,
  selectedQuestions,
  onToggle,
  onToggleCategory,
}: {
  questions: StandardizedQuestion[];
  loading: boolean;
  search: string;
  selectedQuestions: SelectedQuestion[];
  onToggle: (q: SelectedQuestion) => void;
  onToggleCategory: (category: string, questions: StandardizedQuestion[]) => void;
}) {
  if (loading) return <RowsSkeleton rows={5} />;

  const grouped = questions.reduce<Record<string, StandardizedQuestion[]>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {});

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={search ? "No questions match your search" : "No standardized questions"}
        description={search ? "Try a different search term." : "Standardized questions will appear here once added to the database."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-400">Click a category to select all its questions, or pick individual questions.</p>
      {Object.entries(grouped).map(([category, qs]) => {
        const selectedCount = qs.filter((q) => selectedQuestions.some((s) => s.source_type === "standardized" && s.id === q.id)).length;
        const allSelected = selectedCount === qs.length;
        const someSelected = selectedCount > 0 && selectedCount < qs.length;

        return (
          <div key={category} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Category header — clickable to select/deselect all */}
            <button
              type="button"
              onClick={() => onToggleCategory(category, qs)}
              className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3 text-left transition hover:bg-slate-50"
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                allSelected
                  ? "border-teal-500 bg-teal-500"
                  : someSelected
                    ? "border-teal-400 bg-teal-100"
                    : "border-slate-300"
              }`}>
                {allSelected && <Check size={12} className="text-white" />}
                {someSelected && <div className="h-2 w-2 rounded-sm bg-teal-500" />}
              </div>
              <h3 className="flex-1 text-sm font-semibold text-slate-700">{category}</h3>
              <span className="text-xs text-slate-400">
                {selectedCount > 0 ? `${selectedCount}/${qs.length} selected` : `${qs.length} questions`}
              </span>
            </button>
            {/* Individual questions */}
            <div className="divide-y divide-slate-100">
              {qs.map((q) => {
                const selected = selectedQuestions.some((s) => s.source_type === "standardized" && s.id === q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onToggle({
                      source_type: "standardized",
                      id: q.id,
                      text: q.text,
                      code: q.question_code,
                      category: q.category,
                    })}
                    className={`flex w-full items-start gap-4 px-5 py-3 text-left transition ${
                      selected
                        ? "bg-teal-50"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="mt-0.5 flex items-center gap-2">
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                        selected
                          ? "border-teal-500 bg-teal-500"
                          : "border-slate-300"
                      }`}>
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-500">
                        {q.question_code}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{q.text}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Interview Sets Tab
// =============================================================================

function InterviewSetsTab({
  sets,
  search,
  onDelete,
  onEdit,
  onView,
  onTranslations,
}: {
  sets: (SetSummary & { sourceType?: string })[];
  search: string;
  onDelete: (id: number, name: string) => void;
  onEdit: (set: SetSummary) => void;
  onView: (set: SetSummary) => void;
  onTranslations: (set: { id: number; name: string }) => void;
}) {
  if (sets.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title={search ? "No templates match your search" : "No templates yet"}
        description={search ? "Try a different search term." : "Pick questions from the Standardized Questions tab, or use New Template or AI Generate, to create your first interview set."}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sets.map((qs) => (
        <div
          key={qs.id}
          className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6"
        >
          <div className="mb-3 flex items-start justify-between">
            <h2 className="text-base font-semibold text-slate-900">{qs.name}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onEdit(qs)}
                className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-teal-50 hover:text-teal-500 group-hover:opacity-100"
                aria-label={`Edit ${qs.name}`}
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(qs.id, qs.name)}
                className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                aria-label={`Delete ${qs.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-slate-500">{qs.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{qs.questionCount ?? qs.questions.length} questions</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onTranslations(qs)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-700 hover:underline"
                aria-label={`Tagalog and Bisaya translations of ${qs.name}`}
              >
                <Languages size={14} />
                Translations
              </button>
              <button
                onClick={() => onView(qs)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:underline"
              >
                <Eye size={14} />
                View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}