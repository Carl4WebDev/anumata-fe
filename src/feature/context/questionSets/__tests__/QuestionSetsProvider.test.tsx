import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QuestionSetsProvider } from "../QuestionSetsProvider";
import { useQuestionSets } from "../useQuestionSets";
import { questionSetsApi } from "../../../../shared/api/questionSetsApi";

vi.mock("../../../../shared/api/questionSetsApi", () => ({
  questionSetsApi: { getAll: vi.fn(), createWithItems: vi.fn() },
}));
const api = vi.mocked(questionSetsApi);

const wrapper = ({ children }: { children: ReactNode }) => <QuestionSetsProvider>{children}</QuestionSetsProvider>;
const existing = { question_set_id: 1, name: "Intake", description: "", questions: [], item_count: 6, source_type: "standardized" };

beforeEach(() => {
  vi.clearAllMocks();
  api.getAll.mockResolvedValue({ status: "success", message: "", data: [existing] } as never);
});

describe("QuestionSetsProvider — sets built from standardized questions", () => {
  test("a new set appears in the list right away, with its question count", async () => {
    // The server's reply has no item count; the provider knows how many items were sent.
    api.createWithItems.mockResolvedValue({
      status: "success",
      message: "",
      data: { question_set_id: 2, name: "Family check-in", description: "", questions: [], source_type: "standardized" },
    } as never);
    const { result } = renderHook(() => useQuestionSets(), { wrapper });
    await waitFor(() => expect(result.current.questionSets).toHaveLength(1));

    let outcome: { ok: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.addQuestionSetWithItems({
        name: "Family check-in",
        items: [
          { source_type: "standardized", standardized_question_id: 4 },
          { source_type: "standardized", standardized_question_id: 9 },
          { source_type: "custom", custom_question_id: 3 },
        ],
      });
    });

    expect(outcome?.ok).toBe(true);
    expect(result.current.questionSets.map((s) => s.name)).toEqual(["Family check-in", "Intake"]);
    expect(result.current.questionSets[0].questionCount).toBe(3);
    expect(api.getAll).toHaveBeenCalledTimes(1); // no page refresh / refetch needed
  });

  test("a failure leaves the list unchanged and reports the reason", async () => {
    api.createWithItems.mockRejectedValue(new Error("network down"));
    const { result } = renderHook(() => useQuestionSets(), { wrapper });
    await waitFor(() => expect(result.current.questionSets).toHaveLength(1));

    let outcome: { ok: boolean; message?: string } | undefined;
    await act(async () => {
      outcome = await result.current.addQuestionSetWithItems({
        name: "X",
        items: [{ source_type: "standardized", standardized_question_id: 1 }],
      });
    });

    expect(outcome).toEqual({ ok: false, message: "Failed to create interview set" });
    expect(result.current.questionSets).toHaveLength(1);
  });
});
