import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TranslationsModal from "./TranslationsModal";
import type { QuestionTranslations } from "../../../shared/api/translationsApi";

const api = vi.hoisted(() => ({ forQuestionSet: vi.fn(), save: vi.fn() }));
vi.mock("../../../shared/api/translationsApi", () => ({ translationsApi: api }));
vi.mock("../../../shared/context/ToastContext", () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const ROWS: QuestionTranslations[] = [
  {
    source_text: "How have you been sleeping?",
    kind: "question",
    tl: { text: "Kumusta ang tulog mo?", source: "draft", own: false },
    ceb: null,
  },
  { source_text: "What keeps you awake?", kind: "follow_up", tl: { text: "Ano ang nagpupuyat sa iyo?", source: "reviewed", own: true }, ceb: { text: "Unsa'y makapupuyat nimo?", source: "machine", own: true } },
];

beforeEach(() => {
  api.forQuestionSet.mockReset().mockResolvedValue({ data: ROWS });
  api.save.mockReset().mockResolvedValue({ data: ROWS });
});

describe("TranslationsModal", () => {
  test("shows each question with its Tagalog and Bisaya status", async () => {
    render(<TranslationsModal questionSet={{ id: 5, name: "Intake" }} onClose={vi.fn()} />);
    expect(await screen.findByText("How have you been sleeping?")).toBeInTheDocument();
    expect(screen.getByText("Draft — please review")).toBeInTheDocument();
    expect(screen.getByText(/Not yet — the AI translates it/)).toBeInTheDocument();
    expect(screen.getByText("Reviewed by you")).toBeInTheDocument();
    expect(screen.getByText("AI translation — please review")).toBeInTheDocument();
    expect(screen.getByText("1 of 4 translations reviewed")).toBeInTheDocument();
  });

  test("an edited translation is saved for that question and language", async () => {
    const user = userEvent.setup();
    render(<TranslationsModal questionSet={{ id: 5, name: "Intake" }} onClose={vi.fn()} />);
    const box = await screen.findByLabelText("Bisaya translation of: How have you been sleeping?");
    await user.type(box, "Kumusta imong pagkatulog?");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(api.save).toHaveBeenCalledWith(5, "How have you been sleeping?", "ceb", "Kumusta imong pagkatulog?");
  });

  test("an unchanged draft can be approved as it is", async () => {
    const user = userEvent.setup();
    render(<TranslationsModal questionSet={{ id: 5, name: "Intake" }} onClose={vi.fn()} />);
    await screen.findByText("How have you been sleeping?");
    await user.click(screen.getAllByRole("button", { name: "Mark as reviewed" })[0]);
    expect(api.save).toHaveBeenCalledWith(5, "How have you been sleeping?", "tl", "Kumusta ang tulog mo?");
  });
});
