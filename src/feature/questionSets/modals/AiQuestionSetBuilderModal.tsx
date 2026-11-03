import { useState, useCallback } from "react";
import { X, Sparkles, CheckCircle, AlertTriangle, RefreshCw, Trash2, Plus, ChevronDown, ChevronUp, Pencil, CornerDownRight } from "lucide-react";
import { questionSetsApi } from "../../../shared/api/questionSetsApi";
import type {
  AiGeneratedQuestion,
  AiGenerateResponse,
  AiReviewResponse,
  AiRefineResponse,
  AiQuestionIssue,
} from "../../../shared/api/questionSetsApi";
import { useQuestionSets } from "../../context/questionSets/useQuestionSets";
import { useToast } from "../../../shared/context/ToastContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "input" | "draft" | "review";

const CATEGORIES = ["Opening", "Emotional Exploration", "Context", "Impact", "Coping", "Closing"] as const;

export default function AiQuestionSetBuilderModal({ isOpen, onClose }: Props) {
  const { addQuestionSet } = useQuestionSets();
  const { success, error: toastError } = useToast();

  // Step tracking
  const [step, setStep] = useState<Step>("input");

  // Input form state
  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState("");
  const [description, setDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [language, setLanguage] = useState("English");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // Draft state — editable questions
  const [draftQuestions, setDraftQuestions] = useState<AiGeneratedQuestion[]>([]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  // Review state
  const [reviewResult, setReviewResult] = useState<AiReviewResponse | null>(null);

  // Refine state
  const [refiningIndex, setRefiningIndex] = useState<number | null>(null);
  const [refineResult, setRefineResult] = useState<AiRefineResponse | null>(null);

  // Loading states
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [refining, setRefining] = useState(false);
  const [saving, setSaving] = useState(false);

  // Expanded question details
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());

  const toggleExpand = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // ===== Generate =====
  const handleGenerate = useCallback(async () => {
    if (!title.trim() || !focus.trim()) return;
    setGenerating(true);
    try {
      const res = await questionSetsApi.aiGenerate({
        title: title.trim(),
        focus: focus.trim(),
        description: description.trim(),
        num_questions: numQuestions,
        language,
        additional_instructions: additionalInstructions.trim(),
      });
      const data: AiGenerateResponse = res.data;
      setDraftTitle(data.title);
      setDraftDescription(data.description);
      setDraftQuestions(data.questions);
      setReviewResult(null);
      setRefineResult(null);
      setStep("draft");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI generation failed";
      toastError(message);
    } finally {
      setGenerating(false);
    }
  }, [title, focus, description, numQuestions, language, additionalInstructions, toastError]);

  // ===== Review =====
  const handleReview = useCallback(async () => {
    if (draftQuestions.length === 0) return;
    setReviewing(true);
    try {
      const res = await questionSetsApi.aiReview({
        questions: draftQuestions,
        focus: focus.trim(),
      });
      setReviewResult(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI review failed";
      toastError(message);
    } finally {
      setReviewing(false);
    }
  }, [draftQuestions, focus, toastError]);

  // ===== Refine =====
  const handleRefine = useCallback(async (index: number) => {
    const question = draftQuestions[index];
    if (!question) return;
    setRefiningIndex(index);
    setRefineResult(null);
    setRefining(true);
    try {
      const res = await questionSetsApi.aiRefine({ question_text: question.text });
      setRefineResult(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI refinement failed";
      toastError(message);
    } finally {
      setRefining(false);
    }
  }, [draftQuestions, toastError]);

  const acceptRefinement = useCallback(() => {
    if (refineResult && refiningIndex !== null) {
      setDraftQuestions((prev) =>
        prev.map((q, i) => (i === refiningIndex ? { ...q, text: refineResult.revised } : q))
      );
    }
    setRefineResult(null);
    setRefiningIndex(null);
  }, [refineResult, refiningIndex]);

  const rejectRefinement = useCallback(() => {
    setRefineResult(null);
    setRefiningIndex(null);
  }, []);

  // ===== Edit draft question =====
  const updateQuestionText = (index: number, text: string) => {
    setDraftQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, text } : q)));
  };

  const updateQuestionFollowUp = (index: number, follow_up: string) => {
    setDraftQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, follow_up } : q)));
  };

  const updateQuestionCategory = (index: number, category: string) => {
    setDraftQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, category } : q)));
  };

  const removeQuestion = (index: number) => {
    setDraftQuestions((prev) => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 })));
  };

  const addQuestion = () => {
    setDraftQuestions((prev) => [
      ...prev,
      { order: prev.length + 1, text: "", purpose: "", category: "Emotional Exploration" },
    ]);
  };

  // ===== Apply review suggestion =====
  const applyReviewSuggestion = (issue: AiQuestionIssue) => {
    setDraftQuestions((prev) =>
      prev.map((q) =>
        q.order === issue.question_order ? { ...q, text: issue.suggested_revision } : q
      )
    );
  };

  // ===== Approve & Save =====
  const handleApprove = useCallback(async () => {
    const filled = draftQuestions.filter((q) => q.text.trim());
    if (filled.length === 0) {
      toastError("At least one question is required");
      return;
    }
    setSaving(true);
    try {
      await addQuestionSet({
        name: draftTitle.trim() || title.trim(),
        description: draftDescription.trim() || description.trim(),
        questions: filled.map((q) => q.text.trim()),
        followUps: filled.map((q) => q.follow_up?.trim() ?? ""),
      });
      success("Question set created successfully");
      handleClose();
    } catch {
      toastError("Failed to save question set");
    } finally {
      setSaving(false);
    }
  }, [draftQuestions, draftTitle, draftDescription, title, description, addQuestionSet, success, toastError]);

  // ===== Reset =====
  const handleClose = () => {
    setStep("input");
    setTitle("");
    setFocus("");
    setDescription("");
    setNumQuestions(5);
    setLanguage("English");
    setAdditionalInstructions("");
    setDraftQuestions([]);
    setDraftTitle("");
    setDraftDescription("");
    setReviewResult(null);
    setRefineResult(null);
    setRefiningIndex(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50">
              <Sparkles size={18} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {step === "input" ? "AI Question Set Builder" : step === "draft" ? "AI Generated Draft" : "Question Review"}
              </h2>
              <p className="text-xs text-slate-500">
                {step === "input" ? "Generate interview questions with AI assistance" : "Review, edit, and approve before saving"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {/* ===== STEP: INPUT ===== */}
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Initial Emotional Well-Being Assessment"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Focus / Topic *</label>
                <input
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g., General emotional well-being"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the question set's purpose"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Number of Questions</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  >
                    {[3, 4, 5, 6, 7, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option>English</option>
                    <option>Filipino</option>
                    <option>Cebuano</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Additional Instructions</label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="e.g., Use open-ended and non-leading questions"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <p className="text-xs text-slate-400">
                AI-generated questions are drafts. You will review and approve them before they become an active question set.
              </p>
            </div>
          )}

          {/* ===== STEP: DRAFT ===== */}
          {step === "draft" && (
            <div className="space-y-4">
              {/* Draft title/description */}
              <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-teal-600" />
                  <span className="text-xs font-medium text-teal-800">AI DRAFT</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  These questions were generated by AI. Review, edit, add, or remove questions before approving.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {draftQuestions.map((q, i) => (
                  <DraftQuestionCard
                    key={i}
                    question={q}
                    index={i}
                    expanded={expandedQuestions.has(i)}
                    onToggle={() => toggleExpand(i)}
                    onTextChange={(text) => updateQuestionText(i, text)}
                    onFollowUpChange={(text) => updateQuestionFollowUp(i, text)}
                    onCategoryChange={(cat) => updateQuestionCategory(i, cat)}
                    onDelete={() => removeQuestion(i)}
                    onRefine={() => handleRefine(i)}
                    refining={refining && refiningIndex === i}
                    reviewIssues={reviewResult?.issues.filter((iss) => iss.question_order === q.order) || []}
                    onApplySuggestion={applyReviewSuggestion}
                  />
                ))}
              </div>

              <button
                onClick={addQuestion}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 hover:text-teal-600"
              >
                <Plus size={16} />
                Add Question
              </button>

              {/* Refine result */}
              {refineResult && refiningIndex !== null && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-semibold text-green-800">Suggested Revision</p>
                  <p className="mt-2 text-sm text-slate-700">{refineResult.revised}</p>
                  <p className="mt-1 text-xs text-slate-500">{refineResult.reason}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={acceptRefinement}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                    >
                      Accept
                    </button>
                    <button
                      onClick={rejectRefinement}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Review result */}
              {reviewResult && (
                <ReviewResultPanel review={reviewResult} onApplySuggestion={applyReviewSuggestion} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          {step === "input" && (
            <>
              <button onClick={handleClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!title.trim() || !focus.trim() || generating}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate with AI
                  </>
                )}
              </button>
            </>
          )}

          {step === "draft" && (
            <>
              <button onClick={() => setStep("input")} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleReview}
                  disabled={draftQuestions.length === 0 || reviewing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {reviewing ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} />
                      Review Questions
                    </>
                  )}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={draftQuestions.filter((q) => q.text.trim()).length === 0 || saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Approve & Save
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Draft Question Card
// =============================================================================

interface DraftQuestionCardProps {
  question: AiGeneratedQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onFollowUpChange: (text: string) => void;
  onCategoryChange: (category: string) => void;
  onDelete: () => void;
  onRefine: () => void;
  refining: boolean;
  reviewIssues: AiQuestionIssue[];
  onApplySuggestion: (issue: AiQuestionIssue) => void;
}

function DraftQuestionCard({
  question,
  expanded,
  onToggle,
  onTextChange,
  onFollowUpChange,
  onCategoryChange,
  onDelete,
  onRefine,
  refining,
  reviewIssues,
  onApplySuggestion,
}: DraftQuestionCardProps) {
  const hasIssues = reviewIssues.length > 0;

  return (
    <div className={`rounded-xl border p-4 ${hasIssues ? "border-amber-300 bg-amber-50/30" : "border-slate-200"}`}>
      <div className="flex items-start justify-between">
        <button onClick={onToggle} className="flex items-center gap-2 text-left">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
            {question.order}
          </span>
          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
            {question.category}
          </span>
          {hasIssues && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {reviewIssues.length} issue{reviewIssues.length > 1 ? "s" : ""}
            </span>
          )}
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        <div className="flex gap-1">
          <button
            onClick={onRefine}
            disabled={refining}
            title="Improve with AI"
            className="rounded-lg p-1.5 text-teal-500 transition hover:bg-teal-50 disabled:opacity-50"
          >
            <Pencil size={14} className={refining ? "animate-pulse" : ""} />
          </button>
          <button
            onClick={onDelete}
            title="Delete question"
            className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <textarea
        value={question.text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={2}
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <CornerDownRight size={13} className="shrink-0 text-slate-300" />
        <input
          type="text"
          value={question.follow_up ?? ""}
          onChange={(e) => onFollowUpChange(e.target.value)}
          maxLength={300}
          placeholder="Follow-up (optional), asked once if the answer is short"
          aria-label={`Follow-up for question ${question.order}`}
          className="w-full rounded-lg border border-dashed border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {question.purpose && (
            <div>
              <p className="text-xs font-medium text-slate-500">Purpose</p>
              <p className="text-xs text-slate-600">{question.purpose}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-slate-500">Category</p>
            <select
              value={question.category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Review issues */}
      {hasIssues && expanded && (
        <div className="mt-3 space-y-2">
          {reviewIssues.map((issue, i) => (
            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">{issue.issue_type}</p>
              <p className="mt-1 text-xs text-amber-700">{issue.explanation}</p>
              {issue.suggested_revision && (
                <>
                  <p className="mt-2 text-xs text-slate-600">{issue.suggested_revision}</p>
                  <button
                    onClick={() => onApplySuggestion(issue)}
                    className="mt-2 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Apply Suggestion
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Review Result Panel
// =============================================================================

function ReviewResultPanel({ review, onApplySuggestion }: { review: AiReviewResponse; onApplySuggestion: (issue: AiQuestionIssue) => void }) {
  const qualityColors: Record<string, string> = {
    good: "text-green-700 bg-green-100",
    fair: "text-amber-700 bg-amber-100",
    needs_improvement: "text-red-700 bg-red-100",
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-slate-600" />
        <span className="text-sm font-semibold text-slate-800">Review Result</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${qualityColors[review.overall_quality] ?? "bg-slate-100 text-slate-600"}`}>
          {review.overall_quality.replace("_", " ")}
        </span>
      </div>

      {review.issues.length === 0 ? (
        <p className="mt-3 text-sm text-green-700">No issues found. The questions look good.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {review.issues.map((issue, i) => (
            <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Q{issue.question_order}</span>
                <span className="text-xs font-semibold text-amber-800">{issue.issue_type}</span>
              </div>
              <p className="mt-1 text-xs text-amber-700">{issue.explanation}</p>
              {issue.suggested_revision && (
                <>
                  <p className="mt-2 text-xs text-slate-600">{issue.suggested_revision}</p>
                  <button
                    onClick={() => onApplySuggestion(issue)}
                    className="mt-2 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Apply Suggestion
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
