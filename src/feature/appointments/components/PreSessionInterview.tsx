import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardList, Copy, Hourglass, Send } from "lucide-react";
import type { Appointment } from "../../../shared/api/appointmentsApi";
import { useInterviewLinks } from "../../context/interviewLinks/useInterviewLinks";
import { useToast } from "../../../shared/context/ToastContext";
import GenerateLinkModal from "../../interviewLinks/modals/GenerateLinkModal";
import { hasStarted } from "../utils/appointmentUtils";

interface PreSessionInterviewProps {
  appt: Appointment;
  /** Runs an action, then reloads the appointments (and shows a message). */
  onQuickAction: (fn: () => Promise<unknown>, successMessage: string) => void;
}

const RISK_STYLE: Record<string, string> = {
  low: "bg-green-50 text-green-700",
  moderate: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

const actionBtn = "flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50";

/**
 * The patient's AI pre-evaluation interview for this appointment: send it,
 * see whether it's done, and open the results — so the therapist preps in one click.
 */
export default function PreSessionInterview({ appt, onQuickAction }: PreSessionInterviewProps) {
  const { generateLink } = useInterviewLinks();
  const { success, error } = useToast();
  const [sending, setSending] = useState(false);

  const interview = appt.interview ?? null;
  const upcoming = appt.status === "scheduled" && !hasStarted(appt);
  // Past appointments without an interview: nothing useful to show.
  if (!interview && !upcoming) return null;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/interview/${token}`);
      success("Interview link copied — send it to the patient.");
    } catch {
      error("Couldn't copy the link.");
    }
  };

  const sendButton = upcoming && (
    <button onClick={() => setSending(true)} className={actionBtn}>
      <Send size={13} /> Send interview
    </button>
  );

  let line: React.ReactNode;
  if (!interview) {
    line = (
      <Row icon={<ClipboardList size={14} className="text-slate-400" />} text="No pre-session interview yet">
        {sendButton}
      </Row>
    );
  } else if (interview.status === "expired") {
    line = (
      <Row icon={<ClipboardList size={14} className="text-slate-400" />} text="Interview link expired">
        {sendButton}
      </Row>
    );
  } else if (interview.status === "completed" && interview.session_id) {
    const risk = interview.risk_level ?? "";
    line = (
      <Row icon={<CheckCircle2 size={14} className="text-green-600" />} text="Interview done">
        {risk && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_STYLE[risk.toLowerCase()] ?? "bg-slate-100 text-slate-600"}`}>
            {risk} risk
          </span>
        )}
        {interview.spike_count > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
            {interview.spike_count} {interview.spike_count === 1 ? "spike" : "spikes"}
          </span>
        )}
        {interview.crisis && (
          <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            <AlertTriangle size={11} /> Crisis flag
          </span>
        )}
        <Link to={`/sessions/${interview.session_id}`} className="text-xs font-medium text-teal-700 hover:underline">
          View results →
        </Link>
      </Row>
    );
  } else if (interview.status === "completed") {
    line = <Row icon={<Hourglass size={14} className="text-slate-400" />} text="Interview finished — results not ready yet" />;
  } else {
    line = (
      <Row icon={<Hourglass size={14} className="text-amber-500" />} text="Interview sent — not done yet">
        <button onClick={() => void copyLink(interview.token)} className={actionBtn}>
          <Copy size={13} /> Copy link
        </button>
      </Row>
    );
  }

  return (
    <>
      {line}
      {sending && (
        <GenerateLinkModal
          isOpen
          onClose={() => setSending(false)}
          defaultPatientId={appt.patient_id}
          onGenerate={async (data) => {
            const res = await generateLink(data);
            // Reload the appointments so this card shows "Interview sent".
            if (res?.ok) onQuickAction(() => Promise.resolve(), "Pre-session interview created");
            return res;
          }}
        />
      )}
    </>
  );
}

function Row({ icon, text, children }: { icon: React.ReactNode; text: string; children?: React.ReactNode }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-sm text-slate-600">
      {icon}
      <span>{text}</span>
      {children}
    </div>
  );
}
