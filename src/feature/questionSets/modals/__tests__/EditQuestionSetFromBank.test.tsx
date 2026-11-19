import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditQuestionSetModal from "../EditQuestionSetModal";

const api = vi.hoisted(() => ({ getItems: vi.fn() }));
vi.mock("../../../../shared/api/questionSetsApi", () => ({ questionSetsApi: api }));
const bank = vi.hoisted(() => ({ getStandardizedQuestions: vi.fn() }));
vi.mock("../../../../shared/api/standardizedQuestionsApi", () => bank);

const BANK_SET = { id: 9, name: "School", description: "School struggle", questions: [], questionCount: 3 };
const items = (...texts: string[]) => ({ data: texts.map((t, i) => ({ question_text_snapshot: t, display_order: i + 1 })) });
const sq = (id: number, text: string) => ({ id, text, category: "Sleep", question_code: `SQ${id}` });

beforeEach(() => {
  api.getItems.mockReset();
  bank.getStandardizedQuestions.mockReset();
});

const openEditor = (onSave = vi.fn(), onClose = vi.fn()) => {
  render(<EditQuestionSetModal isOpen questionSet={BANK_SET} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose };
};

describe("editing a set built from the question bank", () => {
  test("opens with the set's current questions, not an empty list", async () => {
    api.getItems.mockResolvedValue(items("How do you sleep?", "How is school?", "Who helps you?"));
    openEditor();

    expect(screen.getByRole("button", { name: "Update Template" })).toBeDisabled();
    expect(await screen.findByDisplayValue("How is school?")).toBeInTheDocument();
    expect(api.getItems).toHaveBeenCalledWith(9);
    expect(screen.getByRole("button", { name: "Update Template" })).toBeEnabled();
  });

  test("saving keeps the existing questions and adds the new one", async () => {
    api.getItems.mockResolvedValue(items("Q1", "Q2", "Q3"));
    const { onSave } = openEditor(vi.fn().mockResolvedValue(true));
    await screen.findByDisplayValue("Q3");

    fireEvent.click(screen.getByRole("button", { name: /Add Question/ }));
    fireEvent.change(screen.getByPlaceholderText("Question 4"), { target: { value: "Q4" } });
    fireEvent.click(screen.getByRole("button", { name: "Update Template" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ questions: ["Q1", "Q2", "Q3", "Q4"] }));
  });

  test("questions from the bank can be added; ones already in the set show as added", async () => {
    api.getItems.mockResolvedValue(items("Q1", "Q2", "How do you sleep?"));
    bank.getStandardizedQuestions.mockResolvedValue([sq(1, "How do you sleep?"), sq(2, "What keeps you awake?")]);
    const { onSave } = openEditor(vi.fn().mockResolvedValue(true));
    await screen.findByDisplayValue("Q1");

    fireEvent.click(screen.getByRole("button", { name: /Add from question bank/ }));
    expect(await screen.findByRole("button", { name: "Added: How do you sleep?" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Add: What keeps you awake?" }));
    fireEvent.click(screen.getByRole("button", { name: "Update Template" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ questions: ["Q1", "Q2", "How do you sleep?", "What keeps you awake?"] }),
    );
  });

  test("if the questions can't be loaded, the set can't be saved (so nothing is wiped)", async () => {
    api.getItems.mockRejectedValue(new Error("offline"));
    const { onSave } = openEditor();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't load this set's questions/);
    fireEvent.click(screen.getByRole("button", { name: "Update Template" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  test("stays open when saving fails, closes when it succeeds", async () => {
    api.getItems.mockResolvedValue(items("Q1", "Q2", "Q3"));
    const onSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { onClose } = openEditor(onSave);
    await screen.findByDisplayValue("Q1");

    fireEvent.click(screen.getByRole("button", { name: "Update Template" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Update Template" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
