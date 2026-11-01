import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MicCheckPanel from "../MicCheckPanel";

const getLevel = () => 0;

describe("MicCheckPanel", () => {
  test("asks the patient to say hello while listening", () => {
    render(<MicCheckPanel status="listening" getLevel={getLevel} micOn />);
    expect(screen.getByText(/Say hello/)).toBeInTheDocument();
  });

  test("confirms once the voice is heard", () => {
    render(<MicCheckPanel status="heard" getLevel={getLevel} micOn />);
    expect(screen.getByText("We can hear you.")).toBeInTheDocument();
  });

  test("explains what to check after silence", () => {
    render(<MicCheckPanel status="silent" getLevel={getLevel} micOn />);
    expect(screen.getByText(/can't hear you yet/)).toBeInTheDocument();
  });

  test("a muted mic is called out first, whatever the check says", () => {
    render(<MicCheckPanel status="silent" getLevel={getLevel} micOn={false} />);
    expect(screen.getByText(/microphone is muted/)).toBeInTheDocument();
  });

  test("no microphone at all", () => {
    render(<MicCheckPanel status="unavailable" getLevel={getLevel} micOn />);
    expect(screen.getByText(/No microphone found/)).toBeInTheDocument();
  });
});
