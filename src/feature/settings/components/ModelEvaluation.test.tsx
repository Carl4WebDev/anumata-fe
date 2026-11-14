import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModelEvaluation from "./ModelEvaluation";
import SystemUpdates from "./SystemUpdates";
import InterviewFeatures from "./InterviewFeatures";
import { MODEL_EVALUATIONS } from "../data/evaluationResults";
import { SYSTEM_UPDATES, filterUpdates } from "../data/systemUpdates";

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
    expect(screen.getByText("77.15%")).toBeInTheDocument();
    expect(screen.getByText("Experimental — not in the session result")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Facial expression \(FER\)/ }));
    expect(screen.getByRole("table", { name: "Facial expression (FER) confusion matrix" })).toBeInTheDocument();
    expect(screen.getByText("2,546")).toBeInTheDocument();
  });

  test("explains the terms on request", () => {
    render(<ModelEvaluation />);
    fireEvent.click(screen.getByRole("button", { name: /How to read these numbers/ }));
    expect(screen.getByText(/80% confidence ≠ 80% accurate/)).toBeInTheDocument();
  });
});

describe("filterUpdates (admin search and filters)", () => {
  test("search keeps only matching changes, across all updates", () => {
    const found = filterUpdates(SYSTEM_UPDATES, { search: "grayscale" });
    expect(found.length).toBeGreaterThan(0);
    found.forEach((u) => u.groups.forEach((g) => g.changes.forEach((c) => expect(`${c} ${g.area} ${u.title} ${(u.deploySteps ?? []).join(" ")}`.toLowerCase()).toContain("grayscale"))));
  });

  test("filters: admin-only groups, therapist groups, updates with server steps", () => {
    filterUpdates(SYSTEM_UPDATES, { filter: "admin" }).forEach((u) => u.groups.forEach((g) => expect(g.audience).toBe("admin")));
    filterUpdates(SYSTEM_UPDATES, { filter: "therapist" }).forEach((u) => u.groups.forEach((g) => expect(g.audience).toBeUndefined()));
    filterUpdates(SYSTEM_UPDATES, { filter: "steps" }).forEach((u) => expect(u.deploySteps?.length).toBeGreaterThan(0));
    expect(filterUpdates(SYSTEM_UPDATES, { search: "zzzz" })).toEqual([]);
  });

  test("the admin panel filters as you type, and opens every match", async () => {
    render(<SystemUpdates audience="admin" />);
    fireEvent.change(screen.getByLabelText("Search updates"), { target: { value: "PRC" } });
    expect(screen.getByText(/checked against the PRC verification service/)).toBeInTheDocument();
    expect(screen.queryByText(/Okay ka pa ba mopadayon/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search updates"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Admin only" }));
    expect(screen.getByText("Face model (FER)")).toBeInTheDocument();
    expect(screen.queryByText("Session review")).not.toBeInTheDocument();
  });

  test("therapists get no search or filters", () => {
    render(<SystemUpdates audience="therapist" />);
    expect(screen.queryByLabelText("Search updates")).not.toBeInTheDocument();
  });
});

describe("SystemUpdates panel", () => {
  test("admin: the latest update is open; older ones open on tap, with the steps needed on the live server", () => {
    render(<SystemUpdates audience="admin" />);
    expect(screen.getByText("Saturday, November 14, 2026")).toBeInTheDocument();
    expect(screen.getByText("Face model (FER)")).toBeInTheDocument();
    expect(screen.getByText(/modal volume put anumata-models/)).toBeInTheDocument();
    expect(screen.queryByText(/checked against the PRC verification service/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Friday, November 13, 2026/ }));
    expect(screen.getByText(/checked against the PRC verification service/)).toBeInTheDocument();
    // Nov 14 and Nov 13 both have an admin-only "Administrator" section.
    expect(screen.getAllByText("Administrator")).toHaveLength(2);
    expect(screen.getByText(/add_admin_and_license_verification\.sql/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tuesday, November 3, 2026/ }));
    expect(screen.getByText(/Okay ka pa ba mopadayon/)).toBeInTheDocument();
    expect(screen.getByText(/add_patient_contacts_and_reminders\.sql/)).toBeInTheDocument();
  });

  test("therapist: only changes to their work — no admin sections, no server steps", () => {
    render(<SystemUpdates audience="therapist" />);
    expect(screen.getByText(/77% accurate on its test set/)).toBeInTheDocument();
    expect(screen.queryByText("Face model (FER)")).not.toBeInTheDocument();
    expect(screen.queryByText(/Before it works on the live server/)).not.toBeInTheDocument();
    expect(screen.queryByText(/modal volume put/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Friday, November 13, 2026/ }));
    expect(screen.getByText(/checked against the PRC verification service/)).toBeInTheDocument();
    expect(screen.queryByText("Administrator")).not.toBeInTheDocument();
    expect(screen.queryByText(/\.sql/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Monday, November 2, 2026/ }));
    expect(screen.getByText(/Undo Completed \/ No-show \/ Cancelled within 15 minutes/)).toBeInTheDocument();
    expect(screen.queryByText("Model evaluation")).not.toBeInTheDocument();
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
