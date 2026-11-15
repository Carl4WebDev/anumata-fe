import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AskAmumata from "./AskAmumata";
import { ApiError } from "../../../shared/api/httpClient";

const api = vi.hoisted(() => ({ askAssistant: vi.fn() }));
vi.mock("../../../shared/api/adminApi", () => ({ adminApi: api }));

const voice = vi.hoisted(() => ({ mode: "idle", error: null as string | null, start: vi.fn(), stop: vi.fn(), onText: vi.fn() as (text: string) => void }));
vi.mock("../hooks/useVoiceQuestion", () => ({
  useVoiceQuestion: (onText: (text: string) => void) => {
    voice.onText = onText;
    return voice;
  },
}));

beforeEach(() => {
  api.askAssistant.mockReset();
  voice.mode = "idle";
  voice.error = null;
});

const ask = async (question: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Your question"), question);
  await user.click(screen.getByRole("button", { name: /Ask$/ }));
  return user;
};

describe("Ask Amumata", () => {
  test("shows the matching entries at once, then the AI's answer with what it's based on", async () => {
    let answer!: (value: unknown) => void;
    api.askAssistant.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    render(<AskAmumata />);

    await ask("Why did the voice accuracy drop?");

    expect(screen.getByText("Why did the voice accuracy drop?")).toBeInTheDocument();
    expect(screen.getByText(/Writing an answer/)).toBeInTheDocument();
    expect(screen.getByText("Matching entries")).toBeInTheDocument();
    const [question, passages] = api.askAssistant.mock.calls[0];
    expect(question).toBe("Why did the voice accuracy drop?");
    expect(passages.length).toBeGreaterThan(0);
    expect(passages.length).toBeLessThanOrEqual(5);
    expect(Object.keys(passages[0]).sort()).toEqual(["source", "text", "title"]);

    answer({ data: { answer: "The test became fairer [1].", found: true, sources: [1] } });

    expect(await screen.findByText(/The test became fairer/)).toBeInTheDocument();
    expect(screen.getByText("Based on")).toBeInTheDocument();
    expect(screen.getByText(passages[0].title)).toBeInTheDocument();
  });

  test("a question nothing in the documentation matches is answered without the AI", async () => {
    render(<AskAmumata />);
    await ask("zzqx blorf");
    expect(screen.getByText("That isn't covered in Amumata's documentation yet.")).toBeInTheDocument();
    expect(api.askAssistant).not.toHaveBeenCalled();
  });

  test("when the AI is unavailable, says so and still shows the matching entries", async () => {
    api.askAssistant.mockRejectedValue(new ApiError("The AI couldn't answer right now.", 503, "ASSISTANT_UNAVAILABLE"));
    render(<AskAmumata />);
    await ask("How are face and voice combined?");
    expect(await screen.findByText("The AI couldn't answer right now.")).toBeInTheDocument();
    expect(screen.getByText("Matching entries")).toBeInTheDocument();
  });

  test("an example question can be asked with one tap", async () => {
    api.askAssistant.mockResolvedValue({ data: { answer: "NOT_FOUND", found: false, sources: [] } });
    render(<AskAmumata />);
    await userEvent.setup().click(screen.getByRole("button", { name: "How are face and voice combined?" }));
    expect(api.askAssistant).toHaveBeenCalledWith("How are face and voice combined?", expect.any(Array));
    const card = (await screen.findByText("How are face and voice combined?", { selector: "p" })).closest("article")!;
    expect(within(card).getByText("Matching entries")).toBeInTheDocument();
  });

  test("the microphone fills in the question, to check before asking", async () => {
    render(<AskAmumata />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Ask by voice" }));
    expect(voice.start).toHaveBeenCalled();

    voice.onText("how is privacy protected");
    expect(await screen.findByDisplayValue("how is privacy protected")).toBeInTheDocument();
    expect(api.askAssistant).not.toHaveBeenCalled();
  });

  test("says not to type patient details", () => {
    render(<AskAmumata />);
    expect(screen.getByText(/Don't type patient names or details here/)).toBeInTheDocument();
  });
});
