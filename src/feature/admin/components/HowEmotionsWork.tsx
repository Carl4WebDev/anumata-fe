import { useState } from "react";
import { Brain, ChevronDown, ChevronRight, Info, Lightbulb } from "lucide-react";
import {
  EMOTIONS,
  FUSION_EXAMPLES,
  HOW_STEPS,
  READ_WITH_CARE,
  SESSION_EXAMPLE,
  fuse,
  riskLevel,
  sessionMix,
  type FusionExample,
  type HowStep,
} from "../data/howEmotionsWork";

const pct = (n: number) => `${Math.round(n * 1000) / 10}%`;

function StepCard({ step, defaultOpen }: { step: HowStep; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={open}>
        <span>
          <span className="block font-semibold text-slate-900">{step.title}</span>
          {step.model && <span className="block text-xs text-slate-500">{step.model}</span>}
        </span>
        {open ? <ChevronDown size={16} className="shrink-0 text-slate-400" /> : <ChevronRight size={16} className="shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            {step.plain.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="flex gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
            <Lightbulb size={15} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">Example: </span>
              {step.example}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

/** One worked fusion example: each model's scores, the blend, and the result. */
function FusionExampleCard({ example }: { example: FusionExample }) {
  const result = fuse(example.face, example.voice);
  const lowered = result.confidence < result.rawConfidence;
  const rows = [example.face, example.voice];
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">{example.title}</p>
      <p className="mt-0.5 text-sm text-slate-600">{example.story}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm" aria-label={`Worked example: ${example.title}`}>
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1 pr-3 font-medium">Model</th>
              {EMOTIONS.map((e) => (
                <th key={e} className="px-2 py-1 text-right font-medium">
                  {e}
                </th>
              ))}
              <th className="py-1 pl-3 text-right font-medium">Counts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const confidence = Math.max(...EMOTIONS.map((e) => r.probabilities[e]));
              return (
                <tr key={r.model} className="border-t border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-700">
                    {r.model} → <span className="font-medium">{r.emotion}</span>
                  </td>
                  {EMOTIONS.map((e) => (
                    <td key={e} className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                      {pct(r.probabilities[e])}
                    </td>
                  ))}
                  <td className="py-1.5 pl-3 text-right tabular-nums text-slate-600">50% × {pct(confidence)}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-slate-200 font-semibold text-slate-900">
              <td className="py-1.5 pr-3">Blended</td>
              {EMOTIONS.map((e) => (
                <td key={e} className={`px-2 py-1.5 text-right tabular-nums ${e === result.winner ? "text-teal-700" : ""}`}>
                  {pct(result.combined[e])}
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-slate-800">
        <span className="font-semibold">Result: {result.winner}</span>, confidence{" "}
        {lowered ? (
          <>
            {pct(result.rawConfidence)} lowered to <span className="font-semibold">{pct(result.confidence)}</span> ({result.agreeing} of 2
            models agree)
          </>
        ) : (
          <span className="font-semibold">{pct(result.confidence)}</span>
        )}
        .
      </p>
      <p className="mt-1 text-sm text-slate-600">{example.takeaway}</p>
    </div>
  );
}

function SessionExampleCard() {
  const mix = sessionMix(SESSION_EXAMPLE);
  const negative = mix.Sad + mix.Angry;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">A whole session (5 answers)</p>
      <ul className="mt-2 space-y-1 text-sm">
        {SESSION_EXAMPLE.map((a) => (
          <li key={a.question} className="flex flex-wrap gap-x-2">
            <span className="w-8 font-medium text-slate-500">{a.question}</span>
            <span className="text-slate-800">
              {a.emotion} {pct(a.confidence)}
            </span>
            {a.spike && <span className="text-xs text-amber-700">— spike: {a.spike}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-slate-800">
        Mix: {EMOTIONS.filter((e) => mix[e] > 0)
          .map((e) => `${e} ${mix[e]}%`)
          .join(", ")}
        . Sad + Angry = {negative}% → <span className="font-semibold">Risk level {riskLevel(mix)}</span> (above 60%). Indicator: “Predominantly sad
        affect” (Sad above 50%).
      </p>
    </div>
  );
}

/**
 * Admin, System tab: how the models read a patient's emotions, step by step,
 * with worked examples computed by the same formula as the AI service.
 */
export default function HowEmotionsWork() {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Brain size={18} className="text-teal-600" /> How Amumata Reads Emotions
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        From the recording to the result the therapist sees — what each model does, with examples. Every answer is read as one of four emotions:
        Angry, Happy, Neutral or Sad.
      </p>

      <div className="mt-4 space-y-2">
        {HOW_STEPS.map((step, i) => (
          <StepCard key={step.title} step={step} defaultOpen={i === 0} />
        ))}
      </div>

      <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Worked examples</h3>
      <div className="mt-2 grid gap-3 xl:grid-cols-2">
        {FUSION_EXAMPLES.map((example) => (
          <FusionExampleCard key={example.title} example={example} />
        ))}
      </div>
      <div className="mt-3">
        <SessionExampleCard />
      </div>

      <div className="mt-5 rounded-xl bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <Info size={15} /> Read the results with care
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
          {READ_WITH_CARE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
