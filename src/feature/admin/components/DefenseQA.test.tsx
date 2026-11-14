import { describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DefenseQA from "./DefenseQA";
import { DEFENSE_QA, QA_CATEGORIES } from "../data/defenseQA";
import { MODEL_EVALUATIONS } from "../../settings/data/evaluationResults";

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

describe("Defense Q&A data", () => {
  test("ids are unique and every question has a known category", () => {
    expect(new Set(DEFENSE_QA.map((q) => q.id)).size).toBe(DEFENSE_QA.length);
    DEFENSE_QA.forEach((q) => expect(QA_CATEGORIES).toContain(q.category));
  });

  test("the accuracy answers match the evaluation data", () => {
    const summary = DEFENSE_QA.find((q) => q.id === "accuracy-summary")!.answer;
    for (const m of MODEL_EVALUATIONS) {
      expect(summary).toContain(pct(m.accuracy));
      expect(summary).toContain(`macro F1 ${m.macroF1.toFixed(3)}`);
    }
  });
});

describe("DefenseQA panel", () => {
  test("search finds questions by their numbers and highlights them", async () => {
    const user = userEvent.setup();
    render(<DefenseQA />);
    await user.type(screen.getByLabelText("Search defense questions"), "90.54");
    expect(screen.getByRole("status")).not.toHaveTextContent(`${DEFENSE_QA.length} of`);
    expect(screen.getByText("How accurate are the models?")).toBeInTheDocument();
    expect(document.querySelectorAll("mark").length).toBeGreaterThan(0);
  });

  test("a category narrows the list; answers open on tap", async () => {
    const user = userEvent.setup();
    render(<DefenseQA />);
    await user.click(screen.getByRole("button", { name: /^Fusion, risk & spikes/ }));
    const cards = screen.getAllByRole("article");
    expect(cards.length).toBe(DEFENSE_QA.filter((q) => q.category === "Fusion, risk & spikes").length);

    await user.click(screen.getByRole("button", { name: /How is the risk level computed/ }));
    expect(screen.getByText(/Sad% \+ Angry% above 60%/)).toBeInTheDocument();
  });

  test("'numbers to remember' keeps only questions with key numbers", async () => {
    const user = userEvent.setup();
    render(<DefenseQA />);
    await user.click(screen.getByRole("checkbox", { name: /numbers to remember/ }));
    const withNumbers = DEFENSE_QA.filter((q) => (q.keyNumbers?.length ?? 0) > 0).length;
    expect(screen.getByRole("status")).toHaveTextContent(`${withNumbers} of ${DEFENSE_QA.length}`);
    expect(within(screen.getAllByRole("article")[0]).getAllByText(/./).length).toBeGreaterThan(0);
  });

  test("no match shows a helpful message", async () => {
    const user = userEvent.setup();
    render(<DefenseQA />);
    await user.type(screen.getByLabelText("Search defense questions"), "zzzz");
    expect(screen.getByText(/No questions match/)).toBeInTheDocument();
  });
});
