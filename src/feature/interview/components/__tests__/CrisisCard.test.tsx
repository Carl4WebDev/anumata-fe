import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CrisisCard from "../CrisisCard";

describe("CrisisCard", () => {
  test("shows tap-to-call hotlines and the emergency number", () => {
    render(<CrisisCard lang="en" notified={false} />);
    expect(screen.getByRole("alert")).toHaveTextContent("You're not alone");
    expect(screen.getByRole("link", { name: "1553" })).toHaveAttribute("href", "tel:1553");
    expect(screen.getByRole("link", { name: "0939-936-5233" })).toHaveAttribute("href", "tel:09399365233");
    expect(screen.getByText(/Call 911/)).toBeInTheDocument();
  });

  test("speaks the patient's language", () => {
    render(<CrisisCard lang="tl" notified={false} />);
    expect(screen.getByText("Hindi ka nag-iisa")).toBeInTheDocument();
  });

  test("says the therapist was told only when that really happened", () => {
    const { rerender } = render(<CrisisCard lang="en" notified={false} />);
    expect(screen.queryByText(/therapist has also been told/)).not.toBeInTheDocument();
    rerender(<CrisisCard lang="en" notified />);
    expect(screen.getByText(/therapist has also been told/)).toBeInTheDocument();
  });

  test("can be tucked away and brought back, but never disappears", () => {
    render(<CrisisCard lang="en" notified={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Help lines/ }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
