import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AmumataLogo from "./AmumataLogo";

describe("AmumataLogo", () => {
  test("is a labelled image at the requested size", () => {
    render(<AmumataLogo size={48} />);
    const logo = screen.getByRole("img", { name: "Amumata logo" });
    expect(logo).toHaveAttribute("width", "48");
    expect(logo).toHaveAttribute("height", "48");
  });

  test("two logos on one page don't share a gradient id", () => {
    render(
      <>
        <AmumataLogo />
        <AmumataLogo />
      </>,
    );
    const ids = Array.from(document.querySelectorAll("linearGradient")).map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
  });

  test("white variant: white tile, teal mark", () => {
    const { container } = render(<AmumataLogo variant="white" />);
    expect(container.querySelector("rect")).toHaveAttribute("fill", "#ffffff");
    expect(container.querySelector("path")).toHaveAttribute("stroke", "#0f766e");
  });
});
