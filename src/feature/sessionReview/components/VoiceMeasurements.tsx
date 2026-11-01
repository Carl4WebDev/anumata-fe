import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { AudioDetails } from "../../../shared/types/session";
import { describeBaseline } from "../utils/voiceMeasurements";

function Change({ value, unit, threshold }: { value: number | null | undefined; unit: string; threshold: number }) {
  if (value == null) return null;
  const up = value >= threshold;
  const down = value <= -threshold;
  const Icon = up ? ArrowUp : down ? ArrowDown : Minus;
  const sign = value > 0 ? "+" : "";
  return (
    <span className={`inline-flex items-center gap-0.5 ${up || down ? "text-amber-700" : "text-slate-400"}`}>
      <Icon size={10} />
      {sign}
      {value}
      {unit} vs usual
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 py-1">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-right text-[11px] text-slate-700">{children}</dd>
    </div>
  );
}

/** The patient's measured voice in this answer, compared with their own usual voice. */
export default function VoiceMeasurements({ details }: { details: AudioDetails }) {
  const usual = describeBaseline(details.baseline);
  return (
    <div className="mt-2.5 rounded-lg border border-cyan-100 bg-cyan-50/40 px-2.5 py-1.5">
      <p className="text-[11px] font-medium text-cyan-800">Measured in this answer</p>
      <dl className="divide-y divide-cyan-100/70">
        {details.pitch_mean_hz > 0 && (
          <Row label="Pitch">
            <span className="font-semibold">{details.pitch_mean_hz} Hz</span>
            {details.pitch_min_hz != null && details.pitch_max_hz != null && (
              <span className="text-slate-500">
                {" "}
                (range {details.pitch_min_hz}–{details.pitch_max_hz})
              </span>
            )}{" "}
            <Change value={details.pitch_vs_usual_pct} unit="%" threshold={8} />
          </Row>
        )}
        {details.pitch_variability && details.pitch_variability !== "unknown" && (
          <Row label="Pitch variation">{details.pitch_variability}</Row>
        )}
        <Row label="Loudness">
          <span className="font-semibold">{details.loudness_db} dBFS</span>{" "}
          <Change value={details.loudness_vs_usual_db} unit=" dB" threshold={3} />
        </Row>
        {details.words_per_minute != null && (
          <Row label="Pace">
            <span className="font-semibold">{details.words_per_minute} words/min</span>
            <span className="text-slate-500"> ({details.speech_rate})</span>{" "}
            <Change value={details.pace_vs_usual_pct} unit="%" threshold={15} />
          </Row>
        )}
        <Row label="Pauses">
          <span className="font-semibold">{details.pause_count}</span>
          {details.pause_count! > 0 && <span className="text-slate-500">, longest {details.longest_pause_s} s</span>}
        </Row>
        {details.response_delay_s != null && (
          <Row label="Started speaking after">
            <span className="font-semibold">{details.response_delay_s} s</span>
          </Row>
        )}
      </dl>
      <p className="mt-1 text-[10px] italic text-slate-400">
        Measured from this answer's recording.{usual && ` "Usual" = this patient's average this session (${usual}).`}
      </p>
    </div>
  );
}
