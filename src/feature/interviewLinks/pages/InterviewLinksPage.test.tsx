import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InterviewLinksPage from "./InterviewLinksPage";

const links = [
  { id: 7, token: "tok-7", patientName: "MARIA SANTOS", templateName: "Intake", status: "Pending", createdAt: "Nov 14, 2026" },
  { id: 8, token: "tok-8", patientName: "JUAN CRUZ", templateName: "Intake", status: "Pending", createdAt: "Nov 14, 2026" },
];
vi.mock("../../context/interviewLinks/useInterviewLinks", () => ({
  useInterviewLinks: () => ({ links, generateLink: vi.fn(), removeLink: vi.fn(), loading: false, error: null }),
}));
vi.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ success: vi.fn() }) }));
vi.mock("../modals/GenerateLinkModal", () => ({ default: () => null }));
vi.mock("../hooks/useLiveInterviews", () => ({
  useLiveInterviews: () =>
    new Map([[7, { interview_link_id: 7, patient_name: "MARIA SANTOS", since: null, question_index: 1, question_total: 5 }]]),
}));

describe("InterviewLinksPage — Watch live", () => {
  test("only interviews with the patient in the room get a one-click Watch live button", () => {
    render(
      <MemoryRouter>
        <InterviewLinksPage />
      </MemoryRouter>,
    );
    const buttons = screen.getAllByRole("link", { name: "Watch MARIA SANTOS's interview live" });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toHaveAttribute("href", "/interview-links/7/live"));
    expect(screen.queryByRole("link", { name: /Watch JUAN CRUZ/ })).not.toBeInTheDocument();
  });
});
