import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddQuestionSetModal from "../AddQuestionSetModal";
import EditQuestionSetModal from "../EditQuestionSetModal";

describe("question set forms — follow-ups", () => {
  test("a new set can be created with a follow-up on any question", () => {
    const onSave = vi.fn();
    render(<AddQuestionSetModal isOpen onClose={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Family Concerns"), { target: { value: "Intake" } });
    ["How are you sleeping?", "How is work?", "Who supports you?"].forEach((text, i) =>
      fireEvent.change(screen.getByPlaceholderText(`Question ${i + 1}`), { target: { value: text } }),
    );
    fireEvent.change(screen.getByLabelText("Follow-up for question 2"), { target: { value: "What makes it hard?" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
    expect(onSave).toHaveBeenCalledWith({
      name: "Intake",
      description: "",
      questions: ["How are you sleeping?", "How is work?", "Who supports you?"],
      followUps: ["", "What makes it hard?", ""],
      sensitives: [false, false, false],
    });
  });

  test("editing keeps each follow-up with its question, even after an empty question is dropped", () => {
    const onSave = vi.fn();
    render(
      <EditQuestionSetModal
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        questionSet={{ id: 1, name: "Intake", description: "", questions: ["Q1", "", "Q3", "Q4"], followUps: ["F1", "", "F3", ""] }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Update Template" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ questions: ["Q1", "Q3", "Q4"], followUps: ["F1", "F3", ""] }),
    );
  });
});

describe("question set forms — sensitive questions", () => {
  test("a question can be marked sensitive, and the mark stays with it when editing", () => {
    const onSave = vi.fn();
    render(
      <EditQuestionSetModal
        isOpen
        onClose={vi.fn()}
        onSave={onSave}
        questionSet={{ id: 1, name: "Intake", description: "", questions: ["Q1", "Q2", "Q3"], sensitives: [false, true, false] }}
      />,
    );
    const boxes = screen.getAllByRole("checkbox", { name: /Sensitive question/ });
    expect(boxes.map((b) => (b as HTMLInputElement).checked)).toEqual([false, true, false]);
    fireEvent.click(boxes[2]);
    fireEvent.click(screen.getByRole("button", { name: "Update Template" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ sensitives: [false, true, true] }));
  });
});
