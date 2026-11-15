import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CrisisSupportPanel from "./CrisisSupportPanel";
import { SUPPORT_OPENING } from "../hooks/crisisSupport";

function renderPanel(props: Partial<Parameters<typeof CrisisSupportPanel>[0]> = {}) {
  const handlers = { onContinue: vi.fn(), onBreak: vi.fn(), onEnd: vi.fn() };
  render(<CrisisSupportPanel lang="ceb" line={SUPPORT_OPENING} alert="sent" watching={false} inQuestions {...handlers} {...props} />);
  return handlers;
}

describe("CrisisSupportPanel", () => {
  test("shows the line and choices in the patient's language, with a tap-to-call hotline", () => {
    renderPanel();
    expect(screen.getByText(/Ihunong sa nato ang mga pangutana/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tawag sa NCMH 1553/ })).toHaveAttribute("href", "tel:1553");
    expect(screen.getByRole("button", { name: /Ipadayon ang interview/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mopahulay/ })).toBeInTheDocument();
  });

  test("honest about the therapist: sending → alerted → watching; nothing if the alert failed", () => {
    const { unmount } = render(
      <CrisisSupportPanel lang="en" line={SUPPORT_OPENING} alert="sending" watching={false} inQuestions onContinue={vi.fn()} onBreak={vi.fn()} onEnd={vi.fn()} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Letting your therapist know…");
    unmount();
    renderPanel({ lang: "en", alert: "sent" });
    expect(screen.getByRole("status")).toHaveTextContent("Your therapist has been alerted.");
  });

  test("“is here now” only while the therapist is really watching", () => {
    renderPanel({ lang: "en", watching: true });
    expect(screen.getByRole("status")).toHaveTextContent("Your therapist is here now, watching the interview.");
  });

  test("no claim about the therapist when the alert failed", () => {
    renderPanel({ lang: "en", alert: "failed" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("stopping for today takes a second tap", () => {
    const { onEnd } = renderPanel({ lang: "en" });
    fireEvent.click(screen.getByRole("button", { name: /Stop for today/ }));
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Tap again to stop/ }));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  test("in the warm-up: only continue and the hotline (no break or stop yet)", () => {
    renderPanel({ lang: "en", inQuestions: false });
    expect(screen.getByRole("button", { name: /Continue the interview/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Take a break/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Stop for today/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/recording continues/)).not.toBeInTheDocument();
  });
});
