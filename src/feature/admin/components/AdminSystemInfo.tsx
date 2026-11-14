import SystemUpdates from "../../settings/components/SystemUpdates";
import ModelEvaluation from "../../settings/components/ModelEvaluation";
import InterviewFeatures from "../../settings/components/InterviewFeatures";
import AIModelGuide from "../../settings/components/AIModelGuide";

const SYSTEM_INFO = [
  { label: "System", value: "Amumata v1.0" },
  { label: "FER", value: "EfficientNet-B0 (4-class)" },
  { label: "SER", value: "Wav2Vec2 (4-class)" },
  { label: "LER", value: "XLM-RoBERTa (4-class)" },
  { label: "STT", value: "Faster-Whisper large-v3" },
  { label: "Summary", value: "Llama 3.2:3B via Ollama" },
  { label: "Fusion", value: "Confidence-Adaptive Weighted" },
  { label: "Privacy", value: "RA 10173 Compliant" },
];

const card = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6";

/**
 * System tab: everything about the system itself — every update with its server
 * steps, the models used, their test results, and the technical guide.
 * Therapists see only what affects their work, in Settings.
 */
export default function AdminSystemInfo() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <section className={`${card} lg:col-span-2`}>
          <SystemUpdates audience="admin" />
        </section>
        <section className={`${card} self-start`}>
          <h2 className="mb-4 text-base font-semibold text-slate-900">System Info</h2>
          <div className="space-y-3 text-sm">
            {SYSTEM_INFO.map((item) => (
              <div key={item.label} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-500">{item.label}</span>
                <span className="text-right font-medium text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={card}>
        <ModelEvaluation />
      </section>

      <section className={card}>
        <InterviewFeatures />
      </section>

      <section className={card}>
        <AIModelGuide />
      </section>
    </div>
  );
}
