import { useState, useMemo, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, Copy, Check, AlertTriangle, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { guideSections, type GuideSection, type GuideItem, type VerificationStatus } from "../data/guideContent";

// Local item type adds index for React keys
type IndexedGuideItem = GuideItem & { _index: number };

const VERIFICATION_CONFIG: Record<VerificationStatus, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  verified: { label: "Verified", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle },
  "partially-verified": { label: "Partially Verified", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: HelpCircle },
  "missing-evidence": { label: "Missing Evidence", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle },
  "not-implemented": { label: "Not Implemented", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", icon: XCircle },
};

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const cfg = VERIFICATION_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button onClick={handleCopy} className="ml-2 text-slate-400 hover:text-slate-600 transition" title="Copy to clipboard">
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

function GuideItemCard({ item, searchTerm }: { item: IndexedGuideItem; searchTerm: string }) {
  const [open, setOpen] = useState(false);

  const highlight = useCallback(
    (text: string) => {
      // Convert markdown-style **bold** to <strong>bold</strong>
      let html = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      // Convert `code` to <code>
      html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-slate-700">$1</code>');
      if (!searchTerm.trim()) return html;
      // Skip already-converted HTML tags when highlighting
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![^<]*>)`, "gi");
      return html.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
    },
    [searchTerm]
  );

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-4 transition hover:border-slate-200">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4
              className="text-sm font-semibold text-slate-800"
              dangerouslySetInnerHTML={{ __html: highlight(item.title) }}
            />
            <VerificationBadge status={item.verification} />
          </div>
          {item.source && (
            <p className="text-xs text-slate-400 truncate">{item.source}</p>
          )}
        </div>
        {open ? <ChevronDown size={16} className="shrink-0 text-slate-400 mt-0.5" /> : <ChevronRight size={16} className="shrink-0 text-slate-400 mt-0.5" />}
      </button>

      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div
            className="prose prose-sm max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: highlight(item.content) }}
          />
          {item.tags && item.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {item.source && (
            <div className="mt-2 flex items-center text-xs text-slate-400">
              <span className="truncate">{item.source}</span>
              <CopyButton text={item.source} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, searchTerm }: { section: GuideSection; searchTerm: string }) {
  const [open, setOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const indexed = section.items.map((item, i) => ({ ...item, _index: i }));
    if (!searchTerm.trim()) return indexed;
    const q = searchTerm.toLowerCase();
    return indexed.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [section.items, searchTerm]);

  if (filteredItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <span className="text-sm font-bold">{filteredItems.length}</span>
          </div>
          <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
        </div>
        {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
          {filteredItems.map((item) => (
            <GuideItemCard key={item._index} item={item} searchTerm={searchTerm} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIModelGuide() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => guideSections.map((s) => s.id), []);

  const filteredSections = useMemo(() => {
    let sections = guideSections;
    if (activeCategory) {
      sections = sections.filter((s) => s.id === activeCategory);
    }
    return sections;
  }, [activeCategory]);

  const totalResults = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const q = searchTerm.toLowerCase();
    let count = 0;
    for (const section of filteredSections) {
      for (const item of section.items) {
        if (
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.tags?.some((t: string) => t.toLowerCase().includes(q))
        ) {
          count++;
        }
      }
    }
    return count;
  }, [filteredSections, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">AI Model & Project Guide</h2>
        <p className="mt-1 text-sm text-slate-500">
          Verified technical documentation for the Amumata AI pipeline. Search across model architectures, fusion formulas, evaluation metrics, and defense preparation.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search: softmax, accuracy, FER, SER, fusion, dataset, EfficientNet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            !activeCategory ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All
        </button>
        {guideSections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveCategory(activeCategory === s.id ? null : s.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              activeCategory === s.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>

      {/* Results count */}
      {searchTerm && totalResults !== null && (
        <p className="text-sm text-slate-500">
          {totalResults} result{totalResults !== 1 ? "s" : ""} for &quot;{searchTerm}&quot;
        </p>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {filteredSections.map((section) => (
          <SectionCard key={section.id} section={section} searchTerm={searchTerm} />
        ))}
      </div>

      {/* Empty state */}
      {searchTerm && totalResults === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Search size={32} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">No results for &quot;{searchTerm}&quot;</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try: softmax, accuracy, FER, SER, neutral, fusion, dataset, EfficientNet, Wav2Vec2, confidence
          </p>
        </div>
      )}
    </div>
  );
}