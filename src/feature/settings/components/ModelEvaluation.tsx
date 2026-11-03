import { useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, Info, Users } from "lucide-react";
import { EMOTION_LABELS, MODEL_EVALUATIONS, READING_TIPS, type ModelEvaluation as Evaluation } from "../data/evaluationResults";

// Two decimals, as in the classification reports (e.g. 61.15%).
const pct = (v: number) => `${(Math.round(v * 10000) / 100).toFixed(2)}%`;
const two = (v: number) => v.toFixed(2);

function accuracyTone(accuracy: number): string {
  if (accuracy >= 0.85) return "text-emerald-700";
  if (accuracy >= 0.7) return "text-amber-700";
  return "text-rose-700";
}

/** Confusion matrix as a heat table: darker = more samples; the diagonal is correct. */
function ConfusionMatrix({ model }: { model: Evaluation }) {
  const max = Math.max(...model.confusion.flat());
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] border-separate border-spacing-1 text-xs" aria-label={`${model.name} confusion matrix`}>
        <thead>
          <tr>
            <th className="text-left font-medium text-slate-400">True ↓ / Predicted →</th>
            {EMOTION_LABELS.map((l) => (
              <th key={l} className="font-medium text-slate-600">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.confusion.map((row, i) => (
            <tr key={EMOTION_LABELS[i]}>
              <th className="pr-2 text-left font-medium text-slate-600">{EMOTION_LABELS[i]}</th>
              {row.map((value, j) => {
                const strength = value / max;
                const correct = i === j;
                return (
                  <td
                    key={j}
                    className={`rounded px-2 py-1.5 text-center tabular-nums ${correct ? "font-semibold" : ""} ${strength > 0.55 ? "text-white" : "text-slate-800"}`}
                    style={{ backgroundColor: correct ? `rgba(13, 148, 136, ${0.15 + strength * 0.85})` : `rgba(225, 29, 72, ${0.06 + strength * 0.7})` }}
                  >
                    {value.toLocaleString()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-slate-400">Teal = correct (diagonal); red = mistakes, darker = more.</p>
    </div>
  );
}

function ModelDetails({ model }: { model: Evaluation }) {
  return (
    <div className="mt-3 space-y-4 border-t border-slate-100 pt-3 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 font-medium">Emotion</th>
              <th className="py-1 font-medium">Precision</th>
              <th className="py-1 font-medium">Recall</th>
              <th className="py-1 font-medium">F1</th>
              <th className="py-1 font-medium">Test samples</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {model.perClass.map((c) => (
              <tr key={c.label} className="tabular-nums text-slate-700">
                <td className="py-1 font-medium">{c.label}</td>
                <td className="py-1">{two(c.precision)}</td>
                <td className="py-1">{two(c.recall)}</td>
                <td className="py-1 font-semibold">{two(c.f1)}</td>
                <td className="py-1">{c.support.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfusionMatrix model={model} />
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Trained on</dt>
          <dd className="text-slate-700">{model.datasets}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Data split</dt>
          <dd className="text-slate-700">{model.split}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-slate-500">Training</dt>
          <dd className="text-slate-700">{model.training}</dd>
        </div>
      </dl>
      <ul className="space-y-1 text-xs text-slate-600">
        {model.notes.map((n) => (
          <li key={n} className="flex gap-1.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModelCard({ model }: { model: Evaluation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left" aria-expanded={open}>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{model.name}</p>
          <p className="text-xs text-slate-500">
            {model.backbone} · {model.input}
          </p>
          <span
            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${model.inFusion ? "bg-teal-50 text-teal-700" : "bg-orange-50 text-orange-700"}`}
          >
            {model.inFusion ? "Used in the session result" : "Experimental — not in the session result"}
          </span>
        </div>
        <div className="flex shrink-0 items-start gap-2 text-right">
          <div>
            <p className={`text-2xl font-bold tabular-nums ${accuracyTone(model.accuracy)}`}>{pct(model.accuracy)}</p>
            <p className="text-[11px] text-slate-500">
              accuracy · macro F1 {two(model.macroF1)}
            </p>
            <p className="text-[11px] text-slate-400">{model.testSamples.toLocaleString()} test samples</p>
          </div>
          {open ? <ChevronDown size={16} className="mt-1 text-slate-400" /> : <ChevronRight size={16} className="mt-1 text-slate-400" />}
        </div>
      </button>
      {open && <ModelDetails model={model} />}
    </div>
  );
}

/** The models' real test-set results, in one place for the therapist (and the thesis defense). */
export default function ModelEvaluation() {
  const [tipsOpen, setTipsOpen] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <BarChart3 size={18} className="text-teal-600" />
        <h2 className="text-base font-semibold text-slate-900">Model Evaluation</h2>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        How each AI model scored on test data it never saw during training (evaluated 17 July 2026). The session
        result combines the face and voice models 50/50. Tap a model for the details.
      </p>

      <div className="space-y-3">
        {MODEL_EVALUATIONS.map((m) => (
          <ModelCard key={m.key} model={m} />
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <button onClick={() => setTipsOpen((v) => !v)} className="flex w-full items-center justify-between text-left" aria-expanded={tipsOpen}>
          <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Info size={15} className="text-slate-400" /> How to read these numbers
          </span>
          {tipsOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </button>
        {tipsOpen && (
          <dl className="mt-3 space-y-1.5 text-xs">
            {READING_TIPS.map((t) => (
              <div key={t.term}>
                <dt className="inline font-semibold text-slate-700">{t.term}: </dt>
                <dd className="inline text-slate-600">{t.meaning}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/50 p-4 text-xs text-teal-900">
        <Users size={15} className="mt-0.5 shrink-0 text-teal-600" />
        <p>
          <span className="font-semibold">Real interviews:</span> these are public test sets, not Davao patients. To see
          how often the AI agrees with what patients say about themselves (mood check and feeling words), run{" "}
          <code className="rounded bg-white px-1">npm run eval:self-report</code> in the backend after collecting
          interviews. Full reports: <code className="rounded bg-white px-1">anumata-be/docs/evaluation/</code>.
        </p>
      </div>
    </div>
  );
}
