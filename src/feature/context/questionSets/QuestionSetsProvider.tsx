import { useState, useCallback, useMemo, useEffect } from "react";
import { QuestionSetsContext } from "./QuestionSetsContext";
import { questionSetsApi } from "../../../shared/api/questionSetsApi";
import { ApiError } from "../../../shared/api/httpClient";

function mapQuestionSet(qs: any) {
  return {
    id: qs.question_set_id,
    name: qs.name,
    description: qs.description || "",
    questions: Array.isArray(qs.questions)
      ? qs.questions.map((q: any) => (typeof q === "string" ? q : q.text))
      : [],
  };
}

export const QuestionSetsProvider = ({ children }: { children: React.ReactNode }) => {
  const [questionSets, setQuestionSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
      await questionSetsApi.remove(id);
      setQuestionSets((prev) => prev.filter((qs) => qs.id !== id));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove question set";
      setError(message);
    }
  }, []);

  const value = useMemo(
    () => ({ questionSets, loading, error, clearError, addQuestionSet, updateQuestionSet, removeQuestionSet }),
    [questionSets, loading, error, clearError, addQuestionSet, updateQuestionSet, removeQuestionSet],
  );

  return <QuestionSetsContext.Provider value={value}>{children}</QuestionSetsContext.Provider>;
};
