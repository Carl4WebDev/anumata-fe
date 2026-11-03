import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SessionOverviewCard from "./SessionOverviewCard";
import type { SessionOverviewData } from "../hooks/useSessionComputed";

const data = (selfReport: SessionOverviewData["selfReport"]): SessionOverviewData => ({
  overallEmotion: "Sad",
  overallConfidence: 0.6,
  overallAgreement: 66,
  riskLevel: "Moderate",
  riskReasons: [],
  highestSpikeIndex: null,
  modelsUsed: { fer: true, ser: true, ler: false },
  selfReport,
  reportStatus: "available",
  questionCount: 3,
  completedAnalyses: 3,
  patientName: "Ana",
  templateName: "Intake",
  date: "",
  duration: "",
});

describe("SessionOverviewCard — the patient's own mood", () => {
  test("shows the mood before and after, and the change", () => {
    render(<SessionOverviewCard data={data({ mood_before: 2, mood_after: 4 })} />);
    expect(screen.getByText("Patient's own mood")).toBeInTheDocument();
    expect(screen.getByText("Not good")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("felt better after")).toBeInTheDocument();
  });

  test("a skipped answer says so, with no change shown", () => {
    render(<SessionOverviewCard data={data({ mood_before: 3, mood_after: null })} />);
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(screen.queryByText(/felt|no change/)).not.toBeInTheDocument();
  });

  test("sessions from before the mood check show nothing", () => {
    render(<SessionOverviewCard data={data(null)} />);
    expect(screen.queryByText("Patient's own mood")).not.toBeInTheDocument();
  });
});
