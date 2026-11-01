import { useState, useEffect, useMemo } from "react";
import { Plus, Eye, Trash2, Search, Pencil, Sparkles, BookOpen, User, Layers, AlertCircle, Check, X } from "lucide-react";
import { useQuestionSets } from "../../context/questionSets/useQuestionSets";
import AddQuestionSetModal from "../modals/AddQuestionSetModal";
import EditQuestionSetModal from "../modals/EditQuestionSetModal";
import ViewQuestionSetModal from "../modals/ViewQuestionSetModal";
import AiQuestionSetBuilderModal from "../modals/AiQuestionSetBuilderModal";
import { ListPageSkeleton, RowsSkeleton } from "../../../shared/components/Skeleton";
import EmptyState from "../../../shared/components/EmptyState";
import { useToast } from "../../../shared/context/ToastContext";
import { questionSetsApi } from "../../../shared/api/questionSetsApi";
import {
  getStandardizedQuestions,
  type StandardizedQuestion,
} from "../../../shared/api/standardizedQuestionsApi";
import {
  getCustomQuestions,
  createCustomQuestion,
  updateCustomQuestion,
  deactivateCustomQuestion,
  deleteCustomQuestion,
  type CustomQuestion,
} from "../../../shared/api/customQuestionsApi";

type Tab = "standardized" | "custom" | "sets";

interface SelectedQuestion {
  source_type: "standardized" | "custom";
  id: number;
  text: string;
  code?: string;
  category?: string;
}

export default function QuestionSetsPage() {
  const { questionSets, addQuestionSet, updateQuestionSet, removeQuestionSet, loading, error } = useQuestionSets();
  const { success } = useToast();

  const [tab, setTab] = useState<Tab>("sets");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [editSet, setEditSet] = useState<{ id: number; name: string; description: string; questions: string[] } | null>(null);
  const [viewSet, setViewSet] = useState<{ id: number; name: string; description: string; questions: string[] } | null>(null);

  // Standardized questions state
  const [standardizedQuestions, setStandardizedQuestions] = useState<StandardizedQuestion[]>([]);
  const [sqLoading, setSqLoading] = useState(false);

  // Custom questions state
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [cqLoading, setCqLoading] = useState(false);
  const [showCreateCq, setShowCreateCq] = useState(false);
  const [newCqText, setNewCqText] = useState("");
  const [newCqCategory, setNewCqCategory] = useState("");
  const [editingCq, setEditingCq] = useState<CustomQuestion | null>(null);

  // Selection state (cross-tab)
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestion[]>([]);
  const [showSetNameModal, setShowSetNameModal] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Load standardized questions
  useEffect(() => {
    if (tab === "standardized") {
      setSqLoading(true);
      getStandardizedQuestions()
        .then((data) => setStandardizedQuestions(data || []))
        .catch(() => setStandardizedQuestions([]))
        .finally(() => setSqLoading(false));
    }
  }, [tab]);

  // Load custom questions
  useEffect(() => {
    if (tab === "custom") {
      setCqLoading(true);
      getCustomQuestions()
        .then((data) => setCustomQuestions(data || []))
        .catch(() => setCustomQuestions([]))
        .finally(() => setCqLoading(false));
    }
  }, [tab]);

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

  // Filter custom questions
  const filteredCq = useMemo(() => {
    return (customQuestions || []).filter((q) => {
      const matchesSearch = !search || q.text.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || q.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [customQuestions, search, categoryFilter]);

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
    try {
      await questionSetsApi.createWithItems({
        name: newSetName.trim(),
        description: newSetDescription.trim() || undefined,
        items: selectedQuestions.map((q) => ({
          source_type: q.source_type,
          ...(q.source_type === "standardized"
            ? { standardized_question_id: q.id }
            : { custom_question_id: q.id }),
        })),
      });
      success(`Interview set "${newSetName}" created with ${selectedQuestions.length} questions.`);
      setSelectedQuestions([]);
      setNewSetName("");
      setNewSetDescription("");
      setShowSetNameModal(false);
      // Refresh the sets list
      setTab("sets");
    } catch (e: any) {
      success(e?.message || "Failed to create interview set.");
    } finally {
      setCreating(false);
    }
  };

  // Custom question handlers
  const handleCreateCq = async () => {
    if (!newCqText.trim()) return;
    const created = await createCustomQuestion({ text: newCqText.trim(), category: newCqCategory || undefined });
    setCustomQuestions((prev) => [created, ...prev]);
    setNewCqText("");
    setNewCqCategory("");
    setShowCreateCq(false);
    success("Custom question created.");
  };

  const handleUpdateCq = async () => {
    if (!editingCq) return;
    const updated = await updateCustomQuestion(editingCq.id, { text: editingCq.text, category: editingCq.category || undefined });
    setCustomQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    setEditingCq(null);
    success("Custom question updated.");
  };

  const handleDeactivateCq = async (id: number) => {
    await deactivateCustomQuestion(id);
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedQuestions((prev) => prev.filter((s) => !(s.source_type === "custom" && s.id === id)));
    success("Custom question deactivated.");
  };

  const handleDeleteCq = async (id: number) => {
    await deleteCustomQuestion(id);
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
    setSelectedQuestions((prev) => prev.filter((s) => !(s.source_type === "custom" && s.id === id)));
    success("Custom question deleted.");
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
    if (!editSet) return;
    await updateQuestionSet(editSet.id, data);
    success("Template updated.");
    setEditSet(null);
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
          <p className="mt-1 text-sm text-slate-500">Select questions from the standardized bank or your custom questions to build interview sets.</p>
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
          { id: "custom" as Tab, label: "My Custom Questions", icon: User },
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
            placeholder={tab === "standardized" ? "Search standardized questions..." : tab === "custom" ? "Search custom questions..." : "Search templates..."}
            aria-label="Search"
            className="w-full text-sm outline-none"
          />
        </div>
        {(tab === "standardized" || tab === "custom") && categories.length > 0 && (
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

      {tab === "custom" && (
        <CustomQuestionsTab
          questions={filteredCq}
          loading={cqLoading}
          search={search}
          selectedQuestions={selectedQuestions}
          onToggle={toggleQuestion}
          showCreate={showCreateCq}
          setShowCreate={setShowCreateCq}
          newText={newCqText}
          setNewText={setNewCqText}
          newCategory={newCqCategory}
          setNewCategory={setNewCqCategory}
          onCreate={handleCreateCq}
          editing={editingCq}
          setEditing={setEditingCq}
          onUpdate={handleUpdateCq}
          onDeactivate={handleDeactivateCq}
          onDelete={handleDeleteCq}
        />
      )}

      {tab === "sets" && (
        <InterviewSetsTab
          sets={filteredSets}
          search={search}
          onDelete={handleDeleteSet}
          onEdit={setEditSet}
          onView={setViewSet}
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

      {/* Create Interview Set from Selection Modal */}
      {showSetNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Create Interview Set</h2>
            <p className="mb-4 text-sm text-slate-500">
              {selectedQuestions.length} question{selectedQuestions.length !== 1 ? "s" : ""} selected from standardized and custom sources.
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
// Custom Questions Tab
// =============================================================================

function CustomQuestionsTab({
  questions,
  loading,
  search,
  selectedQuestions,
  onToggle,
  showCreate,
  setShowCreate,
  newText,
  setNewText,
  newCategory,
  setNewCategory,
  onCreate,
  editing,
  setEditing,
  onUpdate,
  onDeactivate,
  onDelete,
}: {
  questions: CustomQuestion[];
  loading: boolean;
  search: string;
  selectedQuestions: SelectedQuestion[];
  onToggle: (q: SelectedQuestion) => void;
  showCreate: boolean;
  setShowCreate: (v: boolean) => void;
  newText: string;
  setNewText: (v: string) => void;
  newCategory: string;
  setNewCategory: (v: string) => void;
  onCreate: () => void;
  editing: CustomQuestion | null;
  setEditing: (q: CustomQuestion | null) => void;
  onUpdate: () => void;
  onDeactivate: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  if (loading) return <RowsSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      {/* Create button */}
      {!showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          <Plus size={16} />
          New Custom Question
        </button>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">New Custom Question</h3>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Enter your question text..."
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
          />
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category (optional)"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
            <button onClick={onCreate} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              <Check size={16} />
            </button>
            <button onClick={() => { setShowCreate(false); setNewText(""); setNewCategory(""); }} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-300">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">Click a question to select it for an interview set.</p>

      {/* Questions list */}
      {questions.length === 0 ? (
        <EmptyState
          icon={User}
          title={search ? "No questions match your search" : "No custom questions yet"}
          description={search ? "Try a different search term." : "Create your first custom question to get started."}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="divide-y divide-slate-100">
            {questions.map((q) => {
              const selected = selectedQuestions.some((s) => s.source_type === "custom" && s.id === q.id);
              return (
                <div key={q.id} className={`group flex items-start gap-4 px-5 py-3 ${selected ? "bg-teal-50" : ""}`}>
                  {editing?.id === q.id ? (
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={editing.text}
                        onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editing.category || ""}
                          onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                          placeholder="Category"
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-teal-400"
                        />
                        <button onClick={onUpdate} className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700">Save</button>
                        <button onClick={() => setEditing(null)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onToggle({
                          source_type: "custom",
                          id: q.id,
                          text: q.text,
                          category: q.category || undefined,
                        })}
                        className="flex items-start gap-3 flex-1 text-left"
                      >
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                          selected ? "border-teal-500 bg-teal-500" : "border-slate-300"
                        }`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800">{q.text}</p>
                          {q.category && (
                            <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{q.category}</span>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setEditing(q)} className="rounded-lg p-1.5 text-slate-300 hover:bg-teal-50 hover:text-teal-500" aria-label="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => onDeactivate(q.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-amber-50 hover:text-amber-500" aria-label="Deactivate">
                          <AlertCircle size={14} />
                        </button>
                        <button onClick={() => onDelete(q.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500" aria-label="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
}: {
  sets: { id: number; name: string; description: string; questions: string[]; questionCount?: number; sourceType?: string }[];
  search: string;
  onDelete: (id: number, name: string) => void;
  onEdit: (set: { id: number; name: string; description: string; questions: string[] }) => void;
  onView: (set: { id: number; name: string; description: string; questions: string[] }) => void;
}) {
  if (sets.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title={search ? "No templates match your search" : "No templates yet"}
        description={search ? "Try a different search term." : "Select questions from the Standardized or Custom tabs to create your first interview set."}
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
            <button
              onClick={() => onView(qs)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:underline"
            >
              <Eye size={14} />
              View
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}