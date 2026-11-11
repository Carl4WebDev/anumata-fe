import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CaptionPanel from "../CaptionPanel";

const renderPanel = (largeText = false) =>
  render(
    <CaptionPanel
      segments={[]}
      listening
      voiceActive={false}
      getLevel={() => 0}
      placeholder="Go ahead — I'm listening."
      largeText={largeText}
    />,
  );

describe("CaptionPanel layout", () => {
  // The room's right column scrolls; a caption box allowed to shrink there got
  // squeezed to nothing and the feeling chips were drawn over its text.
  test("never shrinks below a readable height", () => {
    renderPanel();
    const panel = screen.getByTestId("caption-panel");
    expect(panel.className).toMatch(/\bshrink-0\b/);
    expect(panel.className).toMatch(/\bmin-h-44\b/);
    expect(panel.className).not.toMatch(/\bmin-h-0\b/);
  });

  test("is taller with larger text", () => {
    renderPanel(true);
    expect(screen.getByTestId("caption-panel").className).toMatch(/\bmin-h-56\b/);
  });

  test("shows the placeholder until the patient speaks", () => {
    renderPanel();
    expect(screen.getByText("Go ahead — I'm listening.")).toBeInTheDocument();
  });
});
