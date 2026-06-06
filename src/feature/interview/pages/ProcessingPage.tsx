import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";

const STEPS = [
  "Analyzing facial expressions",
  "Analyzing speech patterns",
  "Detecting emotional spikes",
  "Generating pre-evaluation summary",
];

export default function ProcessingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const delays = [1500, 2000, 1500, 2000];
    let timeout: ReturnType<typeof setTimeout>;

    const advance = (step: number) => {
      if (step >= STEPS.length) {
        setCompleted(true);
        return;
      }
      timeout = setTimeout(() => {
        setCurrentStep(step);
        advance(step + 1);
      }, delays[step] ?? 1500);
    };

    // Start after initial delay
    timeout = setTimeout(() => advance(0), 800);

    return () => clearTimeout(timeout);
  }, []);

  const handleViewResults = () => {
    navigate(`/interview/${token}/results`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-slate-200">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            {completed ? (
              <Check size={32} className="text-green-600" />
            ) : (
              <Loader2 size={32} className="animate-spin text-blue-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {completed ? "Analysis Complete" : "Analyzing Interview"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {completed
              ? "Your pre-evaluation report is ready."
              : "Please wait while we process your responses..."}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {STEPS.map((step, i) => {
            const isDone = i < currentStep || completed;
            const isCurrent = i === currentStep && !completed;

            return (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-green-100"
                      : isCurrent
                        ? "bg-blue-100"
                        : "bg-slate-100"
                  }`}
                >
                  {isDone ? (
                    <Check size={16} className="text-green-600" />
                  ) : isCurrent ? (
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isDone
                      ? "text-green-700 font-medium"
                      : isCurrent
                        ? "text-blue-700 font-medium"
                        : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        {completed && (
          <button
            onClick={handleViewResults}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            View Results
          </button>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          This system does not provide a clinical diagnosis.
        </p>
      </div>
    </div>
  );
}
