import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModelEvaluation from "./ModelEvaluation";
import SystemUpdates from "./SystemUpdates";
import InterviewFeatures from "./InterviewFeatures";
import { MODEL_EVALUATIONS } from "../data/evaluationResults";

describe("evaluation numbers are consistent", () => {
  test.each(MODEL_EVALUATIONS.map((m) => [m.name, m] as const))("%s: matrix, counts and accuracy agree", (_name, m) => {
    const total = m.confusion.flat().reduce((a, b) => a + b, 0);
    expect(total).toBe(m.testSamples);
    m.confusion.forEach((row, i) => expect(row.reduce((a, b) => a + b, 0)).toBe(m.perClass[i].support));
    const correct = m.confusion.reduce((s, row, i) => s + row[i], 0);
    expect(correct / total).toBeCloseTo(m.accuracy, 3);
    m.perClass.forEach((c, i) => {
      const predicted = m.confusion.reduce((s, row) => s + row[i], 0);
      expect(m.confusion[i][i] / predicted).toBeCloseTo(c.precision, 3);
      expect(m.confusion[i][i] / c.support).toBeCloseTo(c.recall, 3);
    });
  });
});

describe("ModelEvaluation panel", () => {
  test("shows each model's accuracy, and details on tap", () => {
    render(<ModelEvaluation />);
    expect(screen.getByText("90.54%")).toBeInTheDocument();
    expect(screen.getByText("74.97%")).toBeInTheDocument();
    expect(screen.getByText("61.15%")).toBeInTheDocument();
    expect(screen.getByText("Experimental — not in the session result")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Facial expression \(FER\)/ }));
    expect(screen.getByRole("table", { name: "Facial expression (FER) confusion matrix" })).toBeInTheDocument();
    expect(screen.getByText("1,958")).toBeInTheDocument();
  });

  test("explains the terms on request", () => {
    render(<ModelEvaluation />);
    fireEvent.click(screen.getByRole("button", { name: /How to read these numbers/ }));
    expect(screen.getByText(/80% confidence ≠ 80% accurate/)).toBeInTheDocument();
  });
});

describe("SystemUpdates panel", () => {
  test("the latest update is open; older ones open on tap, with the steps needed on the live server", () => {
    render(<SystemUpdates />);
    expect(screen.getByText("Tuesday, November 3, 2026")).toBeInTheDocument();
    expect(screen.getByText(/Okay ka pa ba mopadayon/)).toBeInTheDocument();
    expect(screen.queryByText(/Undo Completed \/ No-show \/ Cancelled within 15 minutes/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Monday, November 2, 2026/ }));
    expect(screen.getByText(/Undo Completed \/ No-show \/ Cancelled within 15 minutes/)).toBeInTheDocument();
    expect(screen.getByText(/add_session_types_and_break\.sql/)).toBeInTheDocument();
  });
});

describe("InterviewFeatures panel", () => {
  test("lists the room's features by stage; a stage opens on tap", () => {
    render(<InterviewFeatures />);
    expect(screen.getByText("Interview Room Features")).toBeInTheDocument();
    expect(screen.queryByText("Gentle check-ins")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /During each question/ }));
    expect(screen.getByText("Gentle check-ins")).toBeInTheDocument();
    expect(screen.getByText(/Okay ka pa ba mopadayon/)).toBeInTheDocument();
  });
});
