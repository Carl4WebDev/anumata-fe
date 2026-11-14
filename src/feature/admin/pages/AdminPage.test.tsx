import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminPage from "./AdminPage";
import type { AdminTherapist } from "../../../shared/api/adminApi";

const api = vi.hoisted(() => ({
  usage: vi.fn(),
  listTherapists: vi.fn(),
  getTherapist: vi.fn(),
  setLicense: vi.fn(),
  setActive: vi.fn(),
}));
vi.mock("../../../shared/api/adminApi", () => ({ adminApi: api }));
const health = vi.hoisted(() => ({ fetchSystemHealth: vi.fn() }));
vi.mock("../../../shared/api/healthApi", () => health);
vi.mock("../../context/users/useUser", () => ({ useUser: () => ({ clearUser: vi.fn() }) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("../../../shared/context/ToastContext", () => ({ useToast: () => toast }));

const ANA: AdminTherapist = {
  user_id: 5,
  email: "ana@clinic.ph",
  f_name: "ANA",
  m_name: null,
  l_name: "REYES",
  profession: "psychologist",
  license_number: "0012345",
  license_name: "ANA M. REYES",
  license_status: "pending",
  license_note: null,
  license_checked_at: null,
  license_checked_by_email: null,
  is_active: true,
  deactivated_at: null,
  created_at: "2026-11-01T00:00:00Z",
  patient_count: 3,
  interview_link_count: 4,
};
const SUMMARY = { therapists: 1, pending: 1, verified: 0, not_matched: 0, deactivated: 0 };

const USAGE = {
  counts: {
    therapists: 11,
    therapists_verified: 2,
    therapists_new_30d: 9,
    links_sent_7d: 1,
    links_sent_30d: 17,
    interviews_completed_7d: 1,
    interviews_completed_30d: 15,
    links_unused: 2,
    analyses_ready_7d: 1,
    analyses_ready_30d: 15,
    analyses_failed_7d: 0,
    analyses_failed_30d: 1,
    avg_seconds_to_results_30d: 275,
    appointments_7d: 0,
    appointments_30d: 8,
    follow_ups_30d: 1,
  },
  weekly: [
    { week_start: "2026-11-02", interviews: 3 },
    { week_start: "2026-11-09", interviews: 1 },
  ],
  failures: [{ notification_id: 1, created_at: "2026-11-10T03:00:00Z", therapist_email: "ana@clinic.ph" }],
};

function renderAs(role: string | null) {
  localStorage.clear();
  if (role) {
    localStorage.setItem("user_token", "t");
    localStorage.setItem("user", JSON.stringify({ role }));
  }
  return render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>,
  );
}

/** The page opens on Overview; account tests switch to the Therapists tab. */
async function openTherapists(user: ReturnType<typeof userEvent.setup>) {
  renderAs("ADMIN");
  await user.click(screen.getByRole("button", { name: "Therapists" }));
}

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.listTherapists.mockResolvedValue({ data: { summary: SUMMARY, therapists: [ANA] } });
  api.usage.mockResolvedValue({ data: USAGE });
  health.fetchSystemHealth.mockResolvedValue({
    status: "ok",
    express: { status: "ok" },
    database: { status: "ok" },
    ai_service: { status: "ok", models: { fer: true, ser: true, ler: true, stt: false } },
    ollama: { status: "ok", model: "qwen2.5:7b" },
    timestamp: "2026-11-13T00:00:00Z",
  });
});

describe("AdminPage — Overview", () => {
  test("shows each AI model's status", async () => {
    renderAs("ADMIN");
    expect(await screen.findByText("Face model (FER)")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getAllByText("Loaded")).toHaveLength(3);
    expect(screen.getByText("Not loaded")).toBeInTheDocument();
    expect(screen.getByText("qwen2.5:7b")).toBeInTheDocument();
  });

  test("shows usage counts, the weekly chart and recent failures", async () => {
    renderAs("ADMIN");
    expect(await screen.findByText("How Amumata is used")).toBeInTheDocument();
    expect(screen.getByText("4.6 min")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Interviews analysed per week" })).toBeInTheDocument();
    expect(screen.getByText("ana@clinic.ph")).toBeInTheDocument();
    expect(api.listTherapists).not.toHaveBeenCalled();
  });
});

describe("AdminPage — System", () => {
  test("shows every update with its server steps, the models used and their test results", async () => {
    const user = userEvent.setup();
    renderAs("ADMIN");
    await user.click(screen.getByRole("button", { name: "System" }));
    expect(screen.getByText("Every change to Amumata, newest first, with the steps needed on the live server.")).toBeInTheDocument();
    expect(screen.getByText(/modal volume put anumata-models/)).toBeInTheDocument();
    expect(screen.getByText("EfficientNet-B0 (4-class)")).toBeInTheDocument();
    expect(screen.getByText("90.54%")).toBeInTheDocument();
    expect(screen.getByText("77.15%")).toBeInTheDocument();
  });
});

describe("AdminPage — Therapists", () => {
  test("therapists can't open it", () => {
    renderAs("THERAPIST");
    expect(screen.queryByText("Amumata Admin")).not.toBeInTheDocument();
    expect(api.listTherapists).not.toHaveBeenCalled();
  });

  test("lists pending accounts with their license details — and no patient data", async () => {
    await openTherapists(userEvent.setup());
    expect(await screen.findByText("ANA REYES")).toBeInTheDocument();
    expect(api.listTherapists).toHaveBeenCalledWith({ status: "pending", search: "" });
    expect(screen.getByText("0012345")).toBeInTheDocument();
    expect(screen.getByText("ANA M. REYES")).toBeInTheDocument();
    expect(screen.getByText(/3 patients · 4 links/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open PRC verification/ })).toHaveAttribute("href", "https://verification.prc.gov.ph/");
  });

  test("marking as verified updates the card", async () => {
    const user = userEvent.setup();
    api.setLicense.mockResolvedValue({ data: { ...ANA, license_status: "verified", actions: [] } });
    await openTherapists(user);
    await user.click(await screen.findByRole("button", { name: /Verified/ }));
    expect(api.setLicense).toHaveBeenCalledWith(5, "verified");
    const card = screen.getByRole("article");
    expect(within(card).getByText("Verified", { selector: "span" })).toBeInTheDocument();
  });

  test("'not matched' needs a reason before it can be saved", async () => {
    const user = userEvent.setup();
    api.setLicense.mockResolvedValue({ data: { ...ANA, license_status: "not_matched", actions: [] } });
    await openTherapists(user);
    await user.click(await screen.findByRole("button", { name: /Not matched/ }));
    const save = screen.getByRole("button", { name: 'Save "not matched"' });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText(/Reason/), "No PRC record under this name.");
    await user.click(save);
    expect(api.setLicense).toHaveBeenCalledWith(5, "not_matched", "No PRC record under this name.");
  });

  test("an account can be deactivated, then reactivated", async () => {
    const user = userEvent.setup();
    api.setActive
      .mockResolvedValueOnce({ data: { ...ANA, is_active: false, actions: [] } })
      .mockResolvedValueOnce({ data: { ...ANA, is_active: true, actions: [] } });
    await openTherapists(user);
    await user.click(await screen.findByRole("button", { name: /^Deactivate$/ }));
    await user.click(screen.getByRole("button", { name: "Deactivate account" }));
    expect(api.setActive).toHaveBeenLastCalledWith(5, false, "");
    await user.click(await screen.findByRole("button", { name: /Reactivate/ }));
    expect(api.setActive).toHaveBeenLastCalledWith(5, true);
  });
});
