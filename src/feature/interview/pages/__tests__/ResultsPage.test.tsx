import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResultsPage from "../ResultsPage";

vi.mock("../../../../shared/api/emotionApi", () => ({
  emotionApi: { getResults: () => Promise.reject(new Error("offline")) },
}));

function renderResults() {
  return render(
    <MemoryRouter initialEntries={["/interview/tok/results"]}>
      <Routes>
        <Route path="/interview/:token/results" element={<ResultsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => sessionStorage.clear());

describe("ResultsPage — the end of the interview", () => {
  test("says when the next session is, and always shows who to call", async () => {
    sessionStorage.setItem("amumata_analysis_tok", JSON.stringify({ distribution: { Sad: 60, Neutral: 40 }, total_questions: 3 }));
    sessionStorage.setItem("amumata_result_tok", JSON.stringify({ nextAppointmentAt: "2026-11-16T01:00:00.000Z", duration: 300 }));
    renderResults();
    expect(await screen.findByText("What happens next")).toBeInTheDocument();
    expect(screen.getByText("Monday, November 16 at 9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Need to talk to someone now?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1553" })).toHaveAttribute("href", "tel:1553");
  });

  test("with no appointment booked, and even when the summary can't load, the help lines are there", async () => {
    renderResults();
    expect(await screen.findByText(/get in touch about your next session/)).toBeInTheDocument();
    expect(screen.getByText("Need to talk to someone now?")).toBeInTheDocument();
  });
});
