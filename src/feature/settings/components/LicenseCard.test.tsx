import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LicenseCard from "./LicenseCard";

const updateProfile = vi.fn();
let profile: Record<string, unknown> = {};
vi.mock("../../context/users/useUser", () => ({ useUser: () => ({ profile, updateProfile }) }));
vi.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const renderCard = () =>
  render(
    <MemoryRouter>
      <LicenseCard />
    </MemoryRouter>,
  );

beforeEach(() => {
  updateProfile.mockReset();
  updateProfile.mockResolvedValue({ ok: true });
});

describe("LicenseCard", () => {
  test("shows the verification status and the admin's reason", () => {
    profile = {
      profession: "psychologist",
      license_number: "0012345",
      license_name: "ANA REYES",
      license_status: "not_matched",
      license_note: "No PRC record under this name.",
    };
    renderCard();
    expect(screen.getByText("Didn't match PRC records")).toBeInTheDocument();
    expect(screen.getByText("No PRC record under this name.")).toBeInTheDocument();
  });

  test("an existing therapist can add their license details", async () => {
    const user = userEvent.setup();
    profile = { profession: null, license_number: null, license_name: null, license_status: "pending" };
    renderCard();
    const save = screen.getByRole("button", { name: "Save license details" });
    expect(save).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Profession"), "guidance_counselor");
    await user.type(screen.getByPlaceholderText("e.g. 0012345"), "0054321");
    await user.type(screen.getByPlaceholderText("e.g. MARIA S. REYES"), "Ana Reyes");
    await user.click(save);
    expect(updateProfile).toHaveBeenCalledWith({ profession: "guidance_counselor", license_number: "0054321", license_name: "Ana Reyes" });
  });
});
