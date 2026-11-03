import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContactFields from "./ContactFields";
import { EMPTY_CONTACT } from "./contactValue";

const consentBox = () => screen.getByRole("checkbox", { name: /agreed to get appointment reminders/ });

describe("ContactFields — while reminder emails are off", () => {
  test("no consent box is shown", () => {
    render(<ContactFields value={EMPTY_CONTACT} onChange={vi.fn()} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});

describe("ContactFields — reminder consent", () => {
  beforeEach(() => vi.stubEnv("VITE_REMINDER_EMAILS", "true"));
  afterEach(() => vi.unstubAllEnvs());

  test("consent can't be given without an email", () => {
    render(<ContactFields value={EMPTY_CONTACT} onChange={vi.fn()} />);
    expect(consentBox()).toBeDisabled();
    expect(screen.getByText(/add an email first/)).toBeInTheDocument();
  });

  test("with an email, ticking the box records consent", () => {
    const onChange = vi.fn();
    render(<ContactFields value={{ ...EMPTY_CONTACT, email: "ana@gmail.com" }} onChange={onChange} />);
    fireEvent.click(consentBox());
    expect(onChange).toHaveBeenCalledWith({ contactNumber: "", email: "ana@gmail.com", reminderConsent: true });
  });

  test("clearing the email takes consent away", () => {
    const onChange = vi.fn();
    render(<ContactFields value={{ contactNumber: "", email: "ana@gmail.com", reminderConsent: true }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ contactNumber: "", email: "", reminderConsent: false });
  });
});
