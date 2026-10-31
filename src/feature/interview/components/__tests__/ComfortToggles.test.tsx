import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComfortToggles from "../ComfortToggles";

const setup = (props: Partial<Parameters<typeof ComfortToggles>[0]> = {}) => {
  const onToggleLargeText = vi.fn();
  const onToggleSlowVoice = vi.fn();
  render(
    <ComfortToggles
      largeText={false}
      slowVoice={false}
      onToggleLargeText={onToggleLargeText}
      onToggleSlowVoice={onToggleSlowVoice}
      variant="light"
      {...props}
    />,
  );
  return { onToggleLargeText, onToggleSlowVoice };
};

describe("ComfortToggles", () => {
  test("each button switches its option", () => {
    const { onToggleLargeText, onToggleSlowVoice } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    fireEvent.click(screen.getByRole("button", { name: "Slower voice" }));
    expect(onToggleLargeText).toHaveBeenCalledTimes(1);
    expect(onToggleSlowVoice).toHaveBeenCalledTimes(1);
  });

  test("shows which options are on (also for screen readers)", () => {
    setup({ largeText: true, variant: "dark" });
    expect(screen.getByRole("button", { name: "Larger text" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Slower voice" })).toHaveAttribute("aria-pressed", "false");
  });
});
