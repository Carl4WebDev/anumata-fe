import { useEffect, useState } from "react";
import { CornerDownRight, Languages, Loader2, Save, X } from "lucide-react";
import { translationsApi, type QuestionTranslations, type SavedTranslation } from "../../../shared/api/translationsApi";
import type { QuestionLanguage } from "../../../shared/api/translateApi";
import { ApiError } from "../../../shared/api/httpClient";
import { useToast } from "../../../shared/context/ToastContext";

const LANGS: { key: QuestionLanguage; label: string }[] = [
  { key: "tl", label: "Tagalog" },
  { key: "ceb", label: "Bisaya" },
];

function StatusChip({ saved }: { saved: SavedTranslation | null }) {
  if (!saved) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">Not yet — the AI translates it during the interview</span>;
  if (saved.source === "reviewed")
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Reviewed{saved.own ? " by you" : ""}</span>;
  if (saved.source === "draft") return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">Draft — please review</span>;
  return <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">AI translation — please review</span>;
}

/** One question with its Tagalog and Bisaya boxes. Starts from the saved text; resets when that changes. */
function TranslationRow({ setId, row, onSaved }: { setId: number; row: QuestionTranslations; onSaved: (rows: QuestionTranslations[]) => void }) {
  const { success, error } = useToast();
  const [values, setValues] = useState({ tl: row.tl?.text ?? "", ceb: row.ceb?.text ?? "" });
  const [saving, setSaving] = useState(false);
  const changed = LANGS.filter(({ key }) => values[key].trim() !== (row[key]?.text ?? ""));
  // An unchanged draft or AI translation can be approved as it is.
  const toApprove = LANGS.filter(({ key }) => row[key] && row[key]!.source !== "reviewed" && !changed.some((c) => c.key === key));

  const save = async () => {
    setSaving(true);
    try {
      let latest: QuestionTranslations[] | null = null;
      for (const { key } of [...changed, ...toApprove]) {
        latest = (await translationsApi.save(setId, row.source_text, key, values[key])).data;
      }
      if (latest) onSaved(latest);
      success("Translation saved — it will be used in the next interviews.");
    } catch (err) {
      error(err instanceof ApiError ? err.message : "Couldn't save the translation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="flex items-start gap-1.5 text-sm font-medium text-slate-900">
        {row.kind === "follow_up" && <CornerDownRight size={14} className="mt-0.5 shrink-0 text-slate-400" />}
        {row.kind === "follow_up" && <span className="font-normal text-slate-500">Follow-up:</span>}
        {row.source_text}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {LANGS.map(({ key, label }) => (
          <label key={key} className="block">
            <span className="mb-1 flex flex-wrap items-center justify-between gap-1 text-xs font-medium text-slate-600">
              {label}
              <StatusChip saved={row[key]} />
            </span>
            <textarea
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              rows={2}
              maxLength={1000}
              aria-label={`${label} translation of: ${row.source_text}`}
              placeholder={`${label} translation`}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
            />
          </label>
        ))}
      </div>
      {(changed.length > 0 || toApprove.length > 0) && (
        <div className="mt-2 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {changed.length > 0 ? "Save" : "Mark as reviewed"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Review and edit the Tagalog and Bisaya versions of a question set. Saved
 * translations are used at once in the interview room; questions without one
 * are translated by the AI during the interview (and appear here afterwards).
 */
export default function TranslationsModal({ questionSet, onClose }: { questionSet: { id: number; name: string } | null; onClose: () => void }) {
  const [rows, setRows] = useState<QuestionTranslations[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!questionSet) return;
    let cancelled = false;
    translationsApi
      .forQuestionSet(questionSet.id)
      .then((res) => {
        if (!cancelled) setRows(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Couldn't load the translations.");
      });
    return () => {
      cancelled = true;
    };
  }, [questionSet]);

  if (!questionSet) return null;

  const reviewed = rows?.reduce((n, r) => n + (r.tl?.source === "reviewed" ? 1 : 0) + (r.ceb?.source === "reviewed" ? 1 : 0), 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`Translations of ${questionSet.name}`}>
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Languages size={18} className="text-teal-600" /> Translations — {questionSet.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              When a patient answers in Tagalog or Bisaya, Amumata asks these versions. Review them so every patient hears natural, accurate wording.
            </p>
            {rows && (
              <p className="mt-1 text-xs text-slate-400">
                {reviewed} of {rows.length * 2} translations reviewed
              </p>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto p-5">
          {loadError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
          {!rows && !loadError && (
            <p className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={15} className="animate-spin" /> Loading translations…
            </p>
          )}
          {rows?.map((row) => (
            <TranslationRow
              // Starts over from the saved text whenever it changes.
              key={`${row.source_text}|${row.tl?.text ?? ""}|${row.tl?.source ?? ""}|${row.ceb?.text ?? ""}|${row.ceb?.source ?? ""}`}
              setId={questionSet.id}
              row={row}
              onSaved={setRows}
            />
          ))}
          {rows?.length === 0 && <p className="text-sm text-slate-500">This set has no questions.</p>}
        </div>
      </div>
    </div>
  );
}
