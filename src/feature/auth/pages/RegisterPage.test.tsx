import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RegisterPage from "./RegisterPage";
import { TERMS_VERSION } from "../agreement";

// The form has many fields to type into; under a full test run that takes over 5s.
vi.setConfig({ testTimeout: 20_000 });

const register = vi.fn();
vi.mock("../../context/users/useUser", () => ({
  useUser: () => ({ register, loading: false, error: null }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>, licenseNumber = "0012345") {
  await user.type(screen.getByLabelText("First name"), "Ana");
  await user.type(screen.getByLabelText("Last name"), "Cruz");
  await user.selectOptions(screen.getByLabelText("Profession"), "psychologist");
  await user.type(screen.getByLabelText("PRC license number"), licenseNumber);
  await user.type(screen.getByLabelText("Name on your PRC ID"), "ANA M. CRUZ");
  await user.type(screen.getByLabelText("Email"), "ana@clinic.ph");
  await user.type(screen.getByLabelText("Password"), "Kalamansi#Tree8");
  await user.type(screen.getByLabelText("Confirm password"), "Kalamansi#Tree8");
}

describe("RegisterPage — layout", () => {
  test("uses the Amumata name", () => {
    renderPage();
    expect(screen.getAllByText("Amumata").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Anumata/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Create your therapist account" })).toBeInTheDocument();
  });

  test("password can be shown, and a mismatched confirmation is flagged", async () => {
    const user = userEvent.setup();
    renderPage();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");

    await user.type(password, "Kalamansi#Tree8");
    await user.type(screen.getByLabelText("Confirm password"), "Kalamansi#Tree9");
    expect(screen.getByText("Passwords don't match yet.")).toBeInTheDocument();
  });
});

beforeEach(() => {
  register.mockReset();
  register.mockResolvedValue({ ok: true });
});

describe("RegisterPage — User Consent and Agreement Validation", () => {
  test("Create Account stays disabled until the agreement is accepted", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    const submit = screen.getByRole("button", { name: "Create Account" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /I have read and agree/ }));
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ana@clinic.ph", accepted_terms: true, terms_version: TERMS_VERSION }),
    );
  });

  test("'Read agreement' shows the full agreement; 'I agree' ticks the box", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Read agreement" }));

    const dialog = screen.getByRole("dialog", { name: "Amumata User Agreement" });
    expect(dialog).toHaveTextContent("Terms of Use");
    expect(dialog).toHaveTextContent("Data Privacy Act of 2012, RA 10173");
    expect(dialog).toHaveTextContent("NOT a clinical diagnosis");

    await user.click(screen.getByRole("button", { name: "I agree" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /I have read and agree/ })).toBeChecked();
  });

  test("closing the agreement without agreeing leaves the box unticked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Read agreement" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /I have read and agree/ })).not.toBeChecked();
  });

  test("unticking again blocks registration", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    const box = screen.getByRole("checkbox", { name: /I have read and agree/ });
    await user.click(box);
    await user.click(box);
    expect(screen.getByRole("button", { name: "Create Account" })).toBeDisabled();
    expect(register).not.toHaveBeenCalled();
  });
});

describe("RegisterPage — PRC license", () => {
  test("profession, license number and the name on the PRC ID are sent with the account", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    await user.click(screen.getByRole("checkbox", { name: /I have read and agree/ }));
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ profession: "psychologist", license_number: "0012345", license_name: "ANA M. CRUZ" }),
    );
  });

  test("a license number with letters is caught before sending", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillForm(user, "PRC-12AB");
    await user.click(screen.getByRole("checkbox", { name: /I have read and agree/ }));
    await user.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.getByText(/digits only/)).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });
});
