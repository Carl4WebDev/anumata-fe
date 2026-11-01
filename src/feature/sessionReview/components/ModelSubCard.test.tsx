import { describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ModelSubCard from "./ModelSubCard";
import type { ModelEvidence } from "../hooks/useSessionComputed";

function evidence(overrides: Partial<ModelEvidence>): ModelEvidence {
  return {
    model: "FER",
    available: true,
    emotion: "Angry",
    confidence: 0.49,
    probabilities: null,
    details: null,
    ...overrides,
  };
}

describe("ModelSubCard — emotion cues", () => {
  test("facial expression card lists the typical facial signs of the detected emotion", () => {
    render(<ModelSubCard evidence={evidence({})} />);
    const list = screen.getByRole("list", { name: "Typical facial signs of Angry" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "scowl",
      "glare",
      "sneer",
      "furrowed brow",
      "clenched jaw",
      "flared nostrils",
      "curled lip",
    ]);
    // Honest framing: general signs to verify, not features the model measured.
    expect(screen.getByText(/check them against the evidence frames/)).toBeInTheDocument();
  });

  test("voice tone card lists vocal signs instead", () => {
    render(<ModelSubCard evidence={evidence({ model: "SER", emotion: "Sad" })} />);
    expect(screen.getByRole("list", { name: "Typical vocal signs of Sad" })).toBeInTheDocument();
    expect(screen.getByText("lower pitch")).toBeInTheDocument();
  });

  test("voice card shows the answer's measured numbers against the patient's usual voice", () => {
    const measured = {
      pitch_mean_hz: 231.4,
      pitch_std_hz: 28.1,
      pitch_min_hz: 190.2,
      pitch_max_hz: 270.5,
      pitch_label: "higher than usual (+12.3%)",
      pitch_variability: "very expressive",
      energy_rms: 0.06,
      loudness_db: -21.5,
      energy_label: "louder than usual (+3.2 dB)",
      words_per_minute: 168.2,
      speech_rate: "moderate",
      pause_count: 3,
      longest_pause_s: 2.1,
      response_delay_s: 1.8,
      baseline: { pitch_mean_hz: 206.0, loudness_db: -24.7, words_per_minute: 140.0 },
      pitch_vs_usual_pct: 12.3,
      loudness_vs_usual_db: 3.2,
      pace_vs_usual_pct: 20.1,
      description: "Measured voice: …",
    };
    render(<ModelSubCard evidence={evidence({ model: "SER", emotion: "Happy", details: measured })} />);
    expect(screen.getByText("Measured in this answer")).toBeInTheDocument();
    expect(screen.getByText("231.4 Hz")).toBeInTheDocument();
    expect(screen.getByText(/range 190.2–270.5/)).toBeInTheDocument();
    expect(screen.getByText(/\+12.3% vs usual/)).toBeInTheDocument();
    expect(screen.getByText("-21.5 dBFS")).toBeInTheDocument();
    expect(screen.getByText(/\+3.2 dB vs usual/)).toBeInTheDocument();
    expect(screen.getByText("168.2 words/min")).toBeInTheDocument();
    expect(screen.getByText(/longest 2.1 s/)).toBeInTheDocument();
    expect(screen.getByText("1.8 s")).toBeInTheDocument();
    expect(screen.getByText(/this patient's average this session \(206 Hz, -24.7 dBFS, 140 words\/min\)/)).toBeInTheDocument();
    // The text summary of the same numbers isn't repeated.
    expect(screen.queryByText("Measured voice: …")).not.toBeInTheDocument();
  });

  test("sessions analysed before measurement show no numbers", () => {
    const old = { pitch_mean_hz: 0, pitch_std_hz: 0, pitch_label: "", energy_rms: 0, energy_label: "", speech_rate: "", pitch_variability: "", description: "" };
    render(<ModelSubCard evidence={evidence({ model: "SER", emotion: "Neutral", details: old })} />);
    expect(screen.queryByText("Measured in this answer")).not.toBeInTheDocument();
    expect(screen.queryByText(/Hz/)).not.toBeInTheDocument();
  });

  test("language card and unavailable models show no cues", () => {
    const { rerender } = render(<ModelSubCard evidence={evidence({ model: "LER", emotion: "Neutral" })} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    rerender(<ModelSubCard evidence={evidence({ available: false })} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
