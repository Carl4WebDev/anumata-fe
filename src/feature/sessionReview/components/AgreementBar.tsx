import type { AgreementResult } from "../../../shared/utils/agreementCalculator";

interface AgreementBarProps {
  agreement: AgreementResult;
}

export default function AgreementBar({ agreement }: AgreementBarProps) {
  const hasPartialCoverage = agreement.availableCount > 0 && agreement.availableCount < agreement.totalCount;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${agreement.color}`}>{agreement.label}</span>
          {agreement.availableCount < agreement.totalCount && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
              {agreement.availableCount}/{agreement.totalCount} modalities
            </span>
          )}
        </div>
        <span className="text-slate-500">{agreement.score}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={agreement.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Model agreement: ${agreement.score}% — ${agreement.label}`}
      >
        <div
          className={`h-full rounded-full transition-all ${agreement.barColor}`}
          style={{ width: `${agreement.score}%` }}
        />
      </div>
      {agreement.label === "Limited Evidence" && agreement.agreeing.length > 0 && (
        <p className="text-[10px] text-amber-600">
          Based on {agreement.agreeing.join(", ")} only — limited evidence from a single modality
        </p>
      )}
      {hasPartialCoverage && agreement.unavailable.length > 0 && (
        <p className="text-[10px] text-slate-400">
          {agreement.unavailable.join(", ")} unavailable — based on {agreement.availableCount}/{agreement.totalCount} modalities
        </p>
      )}
      {!hasPartialCoverage && agreement.label !== "Limited Evidence" && agreement.agreeing.length > 0 && (
        <p className="text-[10px] text-slate-400">
          {agreement.agreeing.join(", ")} agree
          {agreement.disagreeing.length > 0 && ` · ${agreement.disagreeing.join(", ")} disagree`}
        </p>
      )}
    </div>
  );
}
