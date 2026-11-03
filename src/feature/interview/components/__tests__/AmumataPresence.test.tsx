import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AmumataPresence from "../AmumataPresence";

describe("AmumataPresence", () => {
  test("shows what Amumata is doing in words, for everyone", () => {
    render(<AmumataPresence mood="listening" label="Go ahead — I'm listening" getLevel={() => 0} />);
    expect(screen.getByText("Go ahead — I'm listening")).toBeInTheDocument();
  });

  test("ripples only while speaking", () => {
    const { container, rerender } = render(<AmumataPresence mood="speaking" label="Amumata is speaking" />);
    expect(container.querySelectorAll(".animate-amumata-ripple")).toHaveLength(2);
    rerender(<AmumataPresence mood="resting" label="Take all the time you need" />);
    expect(container.querySelectorAll(".animate-amumata-ripple")).toHaveLength(0);
    expect(container.querySelector("[data-mood='resting']")).toBeInTheDocument();
  });
});
