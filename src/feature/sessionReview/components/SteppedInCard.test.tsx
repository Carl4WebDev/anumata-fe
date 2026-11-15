import { describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SteppedInCard from "./SteppedInCard";
import { summarizeSteppedIn } from "../utils/steppedIn";
import type { LiveMessage } from "../../../shared/types/session";

const msg = (id: number, over: Partial<LiveMessage>): LiveMessage => ({
  id,
  sender: "therapist",
  kind: "message",
  body: null,
  questionIndex: 2,
  seenAt: null,
  at: "2026-11-15T02:30:00Z",
  ...over,
});

const MESSAGES: LiveMessage[] = [
  msg(1, { kind: "pause" }),
  msg(2, { body: "Nandito ako. Ligtas ka ba ngayon?", seenAt: "2026-11-15T02:30:10Z" }),
  msg(3, { sender: "patient", body: "Oo po, salamat." }),
  msg(4, { body: "I'll call you now.", questionIndex: 3 }),
  msg(5, { kind: "resume", questionIndex: 3 }),
];

describe("stepping in, in the session report", () => {
  test("summary: pauses, messages each way, unseen messages, and where", () => {
    expect(summarizeSteppedIn(MESSAGES)).toEqual({
      pauses: 1,
      fromTherapist: 2,
      fromPatient: 1,
      unseen: 1,
      questions: [2, 3],
      beforeQuestions: false,
    });
    expect(summarizeSteppedIn([msg(1, { kind: "pause", questionIndex: null })]).beforeQuestions).toBe(true);
  });

  test("the card shows the whole conversation, where it happened, and what was seen", () => {
    render(<SteppedInCard messages={MESSAGES} />);
    const card = screen.getByRole("region", { name: "You stepped in" });
    expect(card).toHaveTextContent("1 pause · 2 messages from you · 1 reply from the patient · at Q3, Q4");
    expect(card).toHaveTextContent("1 message was never shown on the patient's screen");
    const thread = within(card).getByRole("list", { name: "Conversation during the interview" });
    expect(within(thread).getByText("You paused the questions")).toBeInTheDocument();
    expect(within(thread).getByText("Nandito ako. Ligtas ka ba ngayon?").parentElement).toHaveTextContent(/seen/);
    expect(within(thread).getByText("I'll call you now.").parentElement).toHaveTextContent("not seen");
    expect(within(thread).getByText("Oo po, salamat.").parentElement).toHaveTextContent("Patient:");
    expect(within(thread).getByText("You resumed the interview")).toBeInTheDocument();
  });

  test("nothing is shown when the therapist didn't step in", () => {
    const { container } = render(<SteppedInCard messages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("an automatic resume says the therapist closed the live view", () => {
    render(<SteppedInCard messages={[msg(1, { kind: "resume", body: "Resumed automatically: the therapist closed the live view." })]} />);
    expect(screen.getByText("Resumed automatically — you closed the live view")).toBeInTheDocument();
  });
});
