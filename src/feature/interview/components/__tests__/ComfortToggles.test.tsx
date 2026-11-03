import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComfortToggles from "../ComfortToggles";

const setup = (props: Partial<Parameters<typeof ComfortToggles>[0]> = {}) => {
  const onToggleLargeText = vi.fn();
  const onToggleSlowVoice = vi.fn();
  const onToggleMoreTime = vi.fn();
  render(
    <ComfortToggles
      largeText={false}
      slowVoice={false}
      moreTime={false}
      onToggleLargeText={onToggleLargeText}
      onToggleSlowVoice={onToggleSlowVoice}
      onToggleMoreTime={onToggleMoreTime}
      variant="light"
      {...props}
    />,
  );
  return { onToggleLargeText, onToggleSlowVoice, onToggleMoreTime };
};

describe("ComfortToggles", () => {
  test("each button switches its option", () => {
    const { onToggleLargeText, onToggleSlowVoice, onToggleMoreTime } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    fireEvent.click(screen.getByRole("button", { name: "Slower voice" }));
    fireEvent.click(screen.getByRole("button", { name: "More time to think" }));
    expect(onToggleLargeText).toHaveBeenCalledTimes(1);
    expect(onToggleSlowVoice).toHaveBeenCalledTimes(1);
    expect(onToggleMoreTime).toHaveBeenCalledTimes(1);
  });

  test("shows which options are on (also for screen readers)", () => {
    setup({ largeText: true, moreTime: true, variant: "dark" });
    expect(screen.getByRole("button", { name: "Larger text" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Slower voice" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "More time to think" })).toHaveAttribute("aria-pressed", "true");
  });
});
