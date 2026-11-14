import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GraduationCap, Hash, Search, X } from "lucide-react";
import { DEFENSE_QA, QA_CATEGORIES, type DefenseQA as QA, type QACategory } from "../data/defenseQA";

/** Wraps every match of `term` in a highlight. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <mark key={i} className="rounded bg-amber-200 px-0.5 text-slate-900">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Plain-text answer: lines starting with "- " become bullets. */
function Answer({ text, term }: { text: string; term: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-slate-700">
      {lines.map((line, i) =>
        line.startsWith("- ") ? (
          <p key={i} className="flex gap-2 pl-1">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
            <span>
              <Highlight text={line.slice(2)} term={term} />
            </span>
          </p>
        ) : (
          <p key={i}>
            <Highlight text={line} term={term} />
          </p>
        ),
      )}
    </div>
  );
}

function hasNumbers(qa: QA): boolean {
  return (qa.keyNumbers?.length ?? 0) > 0;
}

/** Every word of the search must appear somewhere in the question, answer, numbers or tags. */
function matches(qa: QA, term: string): boolean {
  if (!term) return true;
  const haystack = [qa.question, qa.answer, qa.category, ...(qa.keyNumbers ?? []), ...(qa.tags ?? [])].join(" ").toLowerCase();
  return term
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

function QACard({ qa, term, open, onToggle }: { qa: QA; term: string; open: boolean; onToggle: () => void }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        {open ? <ChevronDown size={16} className="mt-0.5 shrink-0 text-slate-400" /> : <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-400" />}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">
            <Highlight text={qa.question} term={term} />
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{qa.category}</p>
        </div>
      </button>
      {hasNumbers(qa) && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 pl-11">
          {qa.keyNumbers!.map((n) => (
            <span key={n} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
              <Highlight text={n} term={term} />
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 pl-11">
          <Answer text={qa.answer} term={term} />
        </div>
      )}
    </article>
  );
}

/** Thesis defense questions with answers — searchable and filterable by category. */
export default function DefenseQA() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<QACategory | "">("");
  const [numbersOnly, setNumbersOnly] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const term = search.trim();

  // Matching the search and the "with numbers" filter; the category filter is applied on top.
  const searched = useMemo(
    () => DEFENSE_QA.filter((qa) => matches(qa, term) && (!numbersOnly || hasNumbers(qa))),
    [term, numbersOnly],
  );
  const results = useMemo(() => searched.filter((qa) => !category || qa.category === category), [searched, category]);
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const qa of searched) c.set(qa.category, (c.get(qa.category) ?? 0) + 1);
    return c;
  }, [searched]);

  // While searching, show the answers so the highlights are visible.
  const isOpen = (id: string) => Boolean(term) || openIds.has(id);
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOpen = results.length > 0 && results.every((qa) => openIds.has(qa.id));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <GraduationCap size={18} className="text-teal-600" />
          <h2 className="text-base font-semibold text-slate-900">Thesis Defense Q&amp;A</h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Likely panel questions with answers taken from the system itself — the numbers match the code and the evaluation files.
        </p>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions, answers or numbers — e.g. accuracy, Davao, 90.54, privacy"
            aria-label="Search defense questions"
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-9 text-sm outline-none focus:border-teal-500"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter by category">
          <button
            onClick={() => setCategory("")}
            aria-pressed={category === ""}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${category === "" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            All
          </button>
          {QA_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? "" : c)}
              aria-pressed={category === c}
              disabled={!counts.get(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-40 ${
                category === c ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {c} <span className="opacity-70">{counts.get(c) ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <label className="flex cursor-pointer items-center gap-2 text-slate-600">
            <input type="checkbox" checked={numbersOnly} onChange={(e) => setNumbersOnly(e.target.checked)} className="accent-teal-600" />
            <Hash size={13} /> Only questions with numbers to remember
          </label>
          <div className="flex items-center gap-3 text-slate-500">
            <span role="status">
              {results.length} of {DEFENSE_QA.length} questions
            </span>
            {!term && results.length > 0 && (
              <button
                onClick={() => setOpenIds(allOpen ? new Set() : new Set(results.map((qa) => qa.id)))}
                className="font-medium text-teal-700 hover:underline"
              >
                {allOpen ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          No questions match{term ? ` “${term}”` : ""}. Try another word, or clear the filters.
        </p>
      ) : (
        <div className="space-y-2">
          {results.map((qa) => (
            <QACard key={qa.id} qa={qa} term={term} open={isOpen(qa.id)} onToggle={() => toggle(qa.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
