import { describe, test, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import HowEmotionsWork from "./HowEmotionsWork";
import { FUSION_EXAMPLES, SESSION_EXAMPLE, fuse, riskLevel, sessionMix } from "../data/howEmotionsWork";

describe("fusion formula (same as src/ai/fusion/fusion_engine.py)", () => {
  test("agreeing models: weighted by confidence, nothing lowered", () => {
    const { face, voice } = FUSION_EXAMPLES[0];
    const r = fuse(face, voice);
    // weights 0.5×0.62 = 0.31 and 0.5×0.70 = 0.35; Sad = (0.62×0.31 + 0.70×0.35) / 0.66
    expect(r.winner).toBe("Sad");
    expect(r.combined.Sad).toBeCloseTo(0.6624, 4);
    expect(r.confidence).toBeCloseTo(r.rawConfidence, 10);
  });

  test("disagreeing models: the surer one counts more, and confidence is lowered", () => {
    const { face, voice } = FUSION_EXAMPLES[1];
    const r = fuse(face, voice);
    // weights 0.275 and 0.40; Sad = (0.30×0.275 + 0.80×0.40) / 0.675 = 0.5963; × (0.5 + 0.5 × 1/2) = 0.4472
    expect(r.winner).toBe("Sad");
    expect(r.rawConfidence).toBeCloseTo(0.5963, 4);
    expect(r.confidence).toBeCloseTo(0.4472, 4);
    expect(r.agreeing).toBe(1);
  });

  test("session mix and risk level", () => {
    const mix = sessionMix(SESSION_EXAMPLE);
    expect(mix).toEqual({ Angry: 20, Happy: 0, Neutral: 20, Sad: 60 });
    expect(riskLevel(mix)).toBe("High");
    expect(riskLevel({ Angry: 10, Happy: 30, Neutral: 30, Sad: 30 })).toBe("Moderate");
    expect(riskLevel({ Angry: 20, Happy: 20, Neutral: 40, Sad: 10 })).toBe("Low");
    // Exactly 60% is not "above 60%".
    expect(riskLevel({ Angry: 20, Happy: 20, Neutral: 20, Sad: 40 })).toBe("Moderate");
  });
});

describe("HowEmotionsWork", () => {
  test("walks through each step with an example; steps open on tap", () => {
    render(<HowEmotionsWork />);
    expect(screen.getByText("How Amumata Reads Emotions")).toBeInTheDocument();
    expect(screen.getByText(/a photo of the patient's face every 3 seconds/)).toBeInTheDocument();
    expect(screen.queryByText(/hears 3 seconds of the patient's speech/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /3\. The voice/ }));
    expect(screen.getByText(/hears 3 seconds of the patient's speech/)).toBeInTheDocument();
  });

  test("shows the worked examples with their computed results", () => {
    render(<HowEmotionsWork />);
    const disagree = screen.getByRole("table", { name: "Worked example: Face and voice disagree" });
    expect(within(disagree).getByText("Blended")).toBeInTheDocument();
    expect(screen.getByText(/59\.6% lowered to/)).toBeInTheDocument();
    expect(screen.getByText("44.7%")).toBeInTheDocument();
    expect(screen.getByText(/Risk level High/)).toBeInTheDocument();
    expect(screen.getByText(/not its accuracy/)).toBeInTheDocument();
  });
});
