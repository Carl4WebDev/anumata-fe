import { useState } from "react";
import { ChevronDown, ChevronRight, Video } from "lucide-react";
import { INTERVIEW_FEATURES, type FeatureGroup } from "../data/interviewFeatures";

function FeatureStage({ group }: { group: FeatureGroup }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={open}>
        <span className="font-semibold text-slate-900">{group.stage}</span>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          {group.features.length} features
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && (
        <ul className="space-y-3 border-t border-slate-100 p-4">
          {group.features.map((f) => (
            <li key={f.name}>
              <p className="text-sm font-medium text-slate-800">{f.name}</p>
              <p className="text-sm text-slate-600">{f.what}</p>
              {f.how && <p className="mt-0.5 text-xs text-teal-700">{f.how}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Everything the patient's interview room does, by stage — a reference for the therapist. */
export default function InterviewFeatures() {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Video size={18} className="text-teal-600" />
        <h2 className="text-base font-semibold text-slate-900">Interview Room Features</h2>
      </div>
      <p className="mb-4 text-sm text-slate-500">What your patients experience in the interview, from the link to the results page.</p>
      <div className="space-y-2">
        {INTERVIEW_FEATURES.map((g) => (
          <FeatureStage key={g.stage} group={g} />
        ))}
      </div>
    </div>
  );
}
