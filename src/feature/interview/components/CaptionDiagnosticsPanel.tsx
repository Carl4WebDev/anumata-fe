import { useEffect, useState } from "react";
import type { CaptionDiagnostics } from "../hooks/useLiveCaptions";

interface CaptionDiagnosticsPanelProps {
  getDiagnostics: () => CaptionDiagnostics;
}

const pct = (value: number) => value.toFixed(4);

/** Shown only with ?debug=1 in the interview link: what the microphone and captions are doing. */
export default function CaptionDiagnosticsPanel({ getDiagnostics }: CaptionDiagnosticsPanelProps) {
  const [d, setD] = useState<CaptionDiagnostics>(getDiagnostics);

  useEffect(() => {
    const timer = setInterval(() => setD(getDiagnostics()), 500);
    return () => clearInterval(timer);
  }, [getDiagnostics]);

  const rows: [string, string][] = [
    ["engine", `${d.engine}${d.running ? "" : " (stopped)"}${d.suspended ? " · paused while Amumata speaks" : ""}`],
    ["mic level", `${pct(d.level)}  (voice ≥ ${pct(d.threshold)})${d.voiceActive ? "  ● voice" : ""}`],
    ["audio", d.audioContext],
    ["browser words", `${d.browserResults}${d.browserLastError ? ` · last error: ${d.browserLastError}` : ""}`],
    ["server phrases", `sent ${d.phrasesSent} · text ${d.phrasesWithText} · empty ${d.phrasesEmpty} · failed ${d.phrasesFailed}`],
    ["last failure", d.lastFailure || "—"],
    ["device", navigator.userAgent],
  ];

  return (
    <section aria-label="Caption diagnostics" className="rounded-lg bg-slate-900/90 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
      {rows.map(([label, value]) => (
        <p key={label} className="wrap-break-word">
          <span className="text-teal-300">{label}:</span> {value}
        </p>
      ))}
    </section>
  );
}
