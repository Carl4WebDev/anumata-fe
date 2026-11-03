import type { AudioDetails } from "../../../shared/types/session";
import { describeBaseline } from "../utils/voiceMeasurements";
import { Change, MeasuredBox, Row } from "./MeasurementRows";

/** The patient's measured voice in this answer, compared with their own usual voice. */
export default function VoiceMeasurements({ details }: { details: AudioDetails }) {
  const usual = describeBaseline(details.baseline);
  return (
    <MeasuredBox
      tone="cyan"
      note={`Measured from this answer's recording.${usual ? ` "Usual" = this patient's average this session (${usual}).` : ""}`}
    >
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
    </MeasuredBox>
  );
}
