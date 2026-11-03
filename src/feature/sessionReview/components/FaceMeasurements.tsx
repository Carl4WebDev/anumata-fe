import { mostSeen, type FaceMeasures } from "../utils/faceAndWordMeasurements";
import { Change, MeasuredBox, Row } from "./MeasurementRows";

/** What the face model read across this answer's frames, compared with the patient's usual face this session. */
export default function FaceMeasurements({ emotion, measures }: { emotion: string; measures: FaceMeasures }) {
  const { frames, percent, usualPercent } = measures;
  const top = frames ? mostSeen(frames) : null;
  const notes = [
    frames ? `Read from ${frames.analysed} photos taken while the patient answered.` : "Read from the photos taken while the patient answered.",
    usualPercent !== null ? `"Usual" = this patient's average this session (${usualPercent}% ${emotion.toLowerCase()}).` : "",
  ];
  return (
    <MeasuredBox tone="violet" note={notes.filter(Boolean).join(" ")}>
      {frames && (
        <Row label="Photos checked">
          <span className="font-semibold">{frames.analysed}</span>
          <span className="text-slate-500">, face found in {frames.face_found}</span>
        </Row>
      )}
      {top && (
        <Row label="Seen most">
          <span className="font-semibold">{top[0]}</span>
          <span className="text-slate-500">
            {" "}
            in {top[1]} of {frames!.face_found} photos
          </span>
        </Row>
      )}
      {frames && frames.face_found > 1 && (
        <Row label="Expression changes">
          {frames.changes === 0 ? "steady — no change" : `${frames.changes} time${frames.changes > 1 ? "s" : ""}`}
        </Row>
      )}
      <Row label={`${emotion} likelihood`}>
        <span className="font-semibold">{percent}%</span>{" "}
        <Change value={usualPercent !== null ? percent - usualPercent : null} unit=" pts" threshold={15} />
      </Row>
    </MeasuredBox>
  );
}
