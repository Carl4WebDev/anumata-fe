import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LicenseBanner from "./LicenseBanner";
import type { TherapistProfile } from "../api/authApi";

let profile: Partial<TherapistProfile> | null = null;
vi.mock("../../feature/context/users/useUser", () => ({ useUser: () => ({ profile }) }));

const base = { role: "THERAPIST", profession: "psychologist", license_number: "0012345", license_name: "ANA REYES" } as const;

const renderBanner = () =>
  render(
    <MemoryRouter>
      <LicenseBanner />
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

describe("LicenseBanner", () => {
  test("reminds a therapist whose license is still pending", () => {
    profile = { ...base, license_status: "pending" };
    renderBanner();
    expect(screen.getByText(/waiting to be verified/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View license details" })).toHaveAttribute("href", "/settings#license");
  });

  test("asks existing therapists without license details to add them", () => {
    profile = { role: "THERAPIST", license_status: "pending", profession: null, license_number: null, license_name: null };
    renderBanner();
    expect(screen.getByText(/Add your profession, PRC license number/)).toBeInTheDocument();
  });

  test("shows the admin's reason when the details didn't match", () => {
    profile = { ...base, license_status: "not_matched", license_note: "No PRC record under this name" };
    renderBanner();
    expect(screen.getByText(/didn't match: No PRC record under this name/)).toBeInTheDocument();
  });

  test("hidden once verified, and for admins", () => {
    profile = { ...base, license_status: "verified" };
    const { container, rerender } = renderBanner();
    expect(container).toBeEmptyDOMElement();
    profile = { ...base, role: "ADMIN", license_status: "pending" };
    rerender(
      <MemoryRouter>
        <LicenseBanner />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test("can be hidden until tomorrow", async () => {
    const user = userEvent.setup();
    profile = { ...base, license_status: "pending" };
    renderBanner();
    await user.click(screen.getByRole("button", { name: "Hide until tomorrow" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    renderBanner();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
