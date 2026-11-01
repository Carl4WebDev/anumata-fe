import { AlertTriangle, CheckCircle2, Mic } from "lucide-react";
import VoiceLevel from "./VoiceLevel";
import type { MicCheckStatus } from "../hooks/useMicCheck";

interface MicCheckPanelProps {
  status: MicCheckStatus;
  getLevel: () => number;
  /** The patient's own mute button. */
  micOn: boolean;
}

type Tone = "info" | "ok" | "warn";

const TONE_CLASS: Record<Tone, string> = {
  info: "text-slate-600",
  ok: "text-green-700",
  warn: "text-amber-700",
};

function messageFor(status: MicCheckStatus, micOn: boolean): { tone: Tone; text: string } {
  if (!micOn) return { tone: "warn", text: "Your microphone is muted. Press the microphone button to turn it on." };
  if (status === "heard") return { tone: "ok", text: "We can hear you." };
  if (status === "silent") {
    return { tone: "warn", text: "We can't hear you yet. Check that your microphone isn't muted and is the one you're using." };
  }
  if (status === "unavailable") return { tone: "warn", text: "No microphone found. Connect one, then reload the page." };
  return { tone: "info", text: "Say hello — the bars should move." };
}

/** Start-screen microphone check: live level bars and a plain verdict. */
export default function MicCheckPanel({ status, getLevel, micOn }: MicCheckPanelProps) {
  const { tone, text } = messageFor(status, micOn);
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : Mic;
  return (
    <div className="mb-4 flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3" role="status">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Microphone check</p>
      <VoiceLevel getLevel={getLevel} active={micOn && status !== "unavailable"} />
      <p className={`flex items-center gap-1.5 text-center text-sm ${TONE_CLASS[tone]}`}>
        <Icon size={16} className="shrink-0" /> {text}
      </p>
    </div>
  );
}
