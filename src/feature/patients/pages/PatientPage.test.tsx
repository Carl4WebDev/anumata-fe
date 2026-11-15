import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PatientsPage from "./PatientPage";
import { visiblePages } from "../../../shared/utils/pagination";

const patient = (i: number, over: Record<string, unknown> = {}) => ({
  id: i,
  name: `Patient ${String(i).padStart(2, "0")}`,
  age: 30,
  gender: "Female",
  sessions: 1,
  risk: "Low",
  lastInterview: "Nov 1, 2026",
  nextFollowUpDate: null,
  isArchived: false,
  profileImage: null,
  ...over,
});

let patients: ReturnType<typeof patient>[] = [];
vi.mock("../../context/patients/usePatients", () => ({
  usePatients: () => ({ patients, addPatient: vi.fn(), loading: false, error: null }),
}));
vi.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ success: vi.fn() }) }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <PatientsPage />
    </MemoryRouter>,
  );
const table = () => screen.getByRole("table");

beforeEach(() => {
  patients = Array.from({ length: 23 }, (_, i) => patient(i + 1));
});

describe("page buttons", () => {
  test("first, last, and the pages around the current one, with gaps", () => {
    expect(visiblePages(1, 1)).toEqual([1]);
    expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
    expect(visiblePages(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(visiblePages(10, 10)).toEqual([1, null, 9, 10]);
  });
});

describe("PatientsPage — pages", () => {
  test("10 patients per page; next and page numbers move through the list", () => {
    renderPage();
    expect(screen.getByText("Showing 1–10 of 23 patients")).toBeInTheDocument();
    expect(within(table()).getByText("Patient 01")).toBeInTheDocument();
    expect(within(table()).queryByText("Patient 11")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 11–20 of 23 patients")).toBeInTheDocument();
    expect(within(table()).getByText("Patient 11")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(screen.getByText("Showing 21–23 of 23 patients")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("searching goes back to page 1 and pages through the matches only", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    fireEvent.change(screen.getByLabelText("Search patients"), { target: { value: "Patient 2" } });
    // Patient 20–23, shown from the start (it was on page 3)
    expect(within(table()).getByText("Patient 20")).toBeInTheDocument();
    expect(within(table()).getAllByRole("link", { name: "View" })).toHaveLength(4);
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
  });

  test("no page buttons when everyone fits on one page", () => {
    patients = patients.slice(0, 10);
    renderPage();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
    expect(within(table()).getAllByRole("link", { name: "View" })).toHaveLength(10);
  });
});
