import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import LiveTalkPanel from "./LiveTalkPanel";
import type { LiveTalkItem } from "../../../shared/api/liveApi";

const item = (ref: string, over: Partial<LiveTalkItem> = {}): LiveTalkItem => ({
  ref,
  sender: "therapist",
  kind: "message",
  body: `message ${ref}`,
  at: "2026-11-15T02:30:00Z",
  seenAt: null,
  ...over,
});

function renderPanel(props: Partial<Parameters<typeof LiveTalkPanel>[0]> = {}) {
  const fns = { sendTalk: vi.fn(() => true), pause: vi.fn(() => true), resume: vi.fn(() => true) };
  render(<LiveTalkPanel connected patientOnline paused={false} held={false} talk={[]} {...fns} {...props} />);
  return fns;
}

describe("LiveTalkPanel", () => {
  test("sending a message pauses the questions first, then sends it", () => {
    const fns = renderPanel();
    expect(screen.getByRole("status")).toHaveTextContent("Sending a message pauses the questions first");
    fireEvent.change(screen.getByRole("textbox", { name: "Message to the patient" }), { target: { value: "  I'm here.  " } });
    fireEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(fns.pause).toHaveBeenCalledTimes(1);
    expect(fns.sendTalk).toHaveBeenCalledWith("I'm here.");
    expect(screen.getByRole("textbox", { name: "Message to the patient" })).toHaveValue("");
  });

  test("already paused: just sends; the button resumes", () => {
    const fns = renderPanel({ paused: true, held: true });
    expect(screen.getByRole("status")).toHaveTextContent("paused on the patient's screen");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Okay ka lang?" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(fns.pause).not.toHaveBeenCalled();
    expect(fns.sendTalk).toHaveBeenCalledWith("Okay ka lang?");
    fireEvent.click(screen.getByRole("button", { name: /Resume interview/ }));
    expect(fns.resume).toHaveBeenCalled();
  });

  test("the pause is only called in effect once the patient's screen shows it", () => {
    renderPanel({ paused: true, held: false });
    expect(screen.getByRole("status")).toHaveTextContent("Pausing…");
  });

  test("quick lines come in the patient's language and go into the box to edit", () => {
    const fns = renderPanel({ language: "ceb" });
    expect(screen.getByText(/Quick lines \(Bisaya\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Are you safe?" }));
    expect(screen.getByRole("textbox")).toHaveValue("Luwas ba ka karon?");
    expect(fns.sendTalk).not.toHaveBeenCalled();
  });

  test("the conversation: Sent until the patient's screen shows it, then Seen; replies and pauses", () => {
    renderPanel({
      paused: true,
      talk: [
        item("p", { kind: "pause", body: null }),
        item("a", { body: "Nandito ako." }),
        item("b", { body: "Ligtas ka ba?", seenAt: "2026-11-15T02:31:00Z" }),
        item("c", { sender: "patient", body: "Oo po." }),
      ],
    });
    const thread = screen.getByRole("list", { name: "Conversation" });
    expect(within(thread).getByText("You paused the questions", { exact: false })).toBeInTheDocument();
    expect(within(thread).getByText("Nandito ako.").parentElement).toHaveTextContent("Sent");
    expect(within(thread).getByText("Ligtas ka ba?").parentElement).toHaveTextContent("Seen");
    expect(within(thread).getByText("Oo po.").parentElement).toHaveTextContent("Patient");
  });

  test("not connected: says nothing was sent and keeps the text", () => {
    renderPanel({ paused: true, sendTalk: vi.fn(() => false) });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /Send/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("nothing was sent");
    expect(screen.getByRole("textbox")).toHaveValue("Hello");
  });

  test("patient not in the room: messages wait for them", () => {
    renderPanel({ patientOnline: false });
    expect(screen.getByRole("status")).toHaveTextContent("The patient isn't in the interview room");
  });
});
