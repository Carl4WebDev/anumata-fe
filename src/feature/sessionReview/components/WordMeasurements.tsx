import type { WordMeasures } from "../utils/faceAndWordMeasurements";
import { Change, MeasuredBox, Row } from "./MeasurementRows";

/** What the language model read from this answer's words, compared with the patient's usual this session. */
export default function WordMeasurements({
  emotion,
  language,
  measures,
}: {
  emotion: string;
  language: string | null | undefined;
  measures: WordMeasures;
}) {
  const { wordCount, percent, usualPercent } = measures;
  const usual = usualPercent !== null ? ` "Usual" = this patient's average this session (${usualPercent}% ${emotion.toLowerCase()}).` : "";
  return (
    <MeasuredBox tone="orange" note={`Read from the transcript of this answer.${usual}`}>
      {wordCount !== null && (
        <Row label="Words spoken">
          <span className="font-semibold">{wordCount}</span>
        </Row>
      )}
      {language && (
        <Row label="Language">
          <span className="font-semibold">{language}</span>
        </Row>
      )}
      <Row label={`${emotion} likelihood`}>
        <span className="font-semibold">{percent}%</span>{" "}
        <Change value={usualPercent !== null ? percent - usualPercent : null} unit=" pts" threshold={15} />
      </Row>
    </MeasuredBox>
  );
}
