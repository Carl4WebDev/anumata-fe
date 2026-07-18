import type { AgreementResult } from "../../../shared/utils/agreementCalculator";

interface AgreementBarProps {
  agreement: AgreementResult;
}

export default function AgreementBar({ agreement }: AgreementBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className={`font-medium ${agreement.color}`}>{agreement.label}</span>
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
      {agreement.agreeing.length > 0 && (
        <p className="text-[10px] text-slate-400">
          {agreement.agreeing.join(", ")} agree
          {agreement.disagreeing.length > 0 && ` · ${agreement.disagreeing.join(", ")} disagree`}
        </p>
      )}
    </div>
  );
}
