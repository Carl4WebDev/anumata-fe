import { useState, useCallback, useMemo, useEffect } from "react";
import { QuestionSetsContext } from "./QuestionSetsContext";
import { questionSetsApi } from "../../../shared/api/questionSetsApi";
import { ApiError } from "../../../shared/api/httpClient";
import { optimistic, removeItems } from "../../../shared/utils/optimistic";
import type { QuestionSetItemsData } from "./QuestionSetsContext";

function mapQuestionSet(qs: any) {
  const legacyQuestions = Array.isArray(qs.questions)
    ? qs.questions.map((q: any) => (typeof q === "string" ? q : q.text))
    : [];
  // Use item_count from question_set_items if available, otherwise fall back to legacy questions
  const questionCount = (qs.item_count ?? 0) > 0 ? qs.item_count : legacyQuestions.length;
  return {
    id: qs.question_set_id,
    name: qs.name,
    description: qs.description || "",
    questions: legacyQuestions,
    questionCount,
    sourceType: qs.source_type || "custom",
  };
}

export const QuestionSetsProvider = ({ children }: { children: React.ReactNode }) => {
  const [questionSets, setQuestionSets] = useState<any[]>([]);
  // Start as loading: the first fetch begins on mount, so never flash an empty list.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await questionSetsApi.getAll();
      setQuestionSets(res.data.map(mapQuestionSet));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load question sets";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  const clearError = useCallback(() => setError(null), []);

  const addQuestionSet = useCallback(async (data: { name: string; description: string; questions: string[] }) => {
    try {
      const res = await questionSetsApi.create({
        name: data.name,
        description: data.description,
        questions: data.questions,
      });
      const mapped = mapQuestionSet(res.data);
      setQuestionSets((prev) => [mapped, ...prev]);
      return { ok: true, data: mapped };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to add question set";
      setError(message);
      return { ok: false };
    }
  }, []);

  /** A set built from standardized / custom questions: shown in the list right away. */
  const addQuestionSetWithItems = useCallback(async (data: QuestionSetItemsData) => {
    try {
      const res = await questionSetsApi.createWithItems(data);
      // The server's reply has no item count; it's the number of items we sent.
      const mapped = mapQuestionSet({ ...res.data, item_count: data.items.length });
      setQuestionSets((prev) => [mapped, ...prev]);
      return { ok: true, data: mapped };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to create interview set";
      return { ok: false, message };
    }
  }, []);

  const updateQuestionSet = useCallback(async (id: number, data: { name: string; description: string; questions: string[] }) => {
    try {
      const res = await questionSetsApi.update(id, {
        name: data.name,
        description: data.description,
        questions: data.questions,
      });
      const mapped = mapQuestionSet(res.data);
      setQuestionSets((prev) => prev.map((qs) => (qs.id === id ? mapped : qs)));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update question set";
      setError(message);
    }
  }, []);

  const removeQuestionSet = useCallback(async (id: number) => {
    try {
      await optimistic(setQuestionSets, removeItems((qs: { id: number }) => qs.id === id), () => questionSetsApi.remove(id));
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove question set";
      setError(`${message} — the question set was put back.`);
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({ questionSets, loading, error, clearError, addQuestionSet, addQuestionSetWithItems, updateQuestionSet, removeQuestionSet }),
    [questionSets, loading, error, clearError, addQuestionSet, addQuestionSetWithItems, updateQuestionSet, removeQuestionSet],
  );

  return <QuestionSetsContext.Provider value={value}>{children}</QuestionSetsContext.Provider>;
};
