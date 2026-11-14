import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, Info, LayoutDashboard, LogOut, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import AmumataLogo from "../../../shared/components/AmumataLogo";
import { adminApi, type AdminFilter, type AdminSummary, type AdminTherapist } from "../../../shared/api/adminApi";
import { ApiError } from "../../../shared/api/httpClient";
import { useToast } from "../../../shared/context/ToastContext";
import { useUser } from "../../context/users/useUser";
import { storedRole } from "../../context/users/homePath";
import TherapistAccountCard from "../components/TherapistAccountCard";
import AdminOverview from "../components/AdminOverview";
import AdminSystemInfo from "../components/AdminSystemInfo";
import DefenseQA from "../components/DefenseQA";

const FILTERS: { value: AdminFilter; label: string; count: (s: AdminSummary) => number }[] = [
  { value: "pending", label: "Pending", count: (s) => s.pending },
  { value: "not_matched", label: "Not matched", count: (s) => s.not_matched },
  { value: "verified", label: "Verified", count: (s) => s.verified },
  { value: "deactivated", label: "Deactivated", count: (s) => s.deactivated },
  { value: "", label: "All", count: (s) => s.therapists },
];

/**
 * Admin: system status and usage (Overview), and therapist accounts with their PRC
 * license checks. Shows account data and counts only — never patient names, sessions or notes.
 */
export default function AdminPage() {
  if (!localStorage.getItem("user_token")) return <Navigate to="/login" replace />;
  if (storedRole() !== "ADMIN") return <Navigate to="/dashboard" replace />;
  return <AdminConsole />;
}

type AdminTab = "overview" | "therapists" | "system" | "defense";

function AdminConsole() {
  const { clearUser } = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");

  const logout = () => {
    clearUser();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <AmumataLogo size={36} />
            <div>
              <p className="font-bold text-slate-900">Amumata Admin</p>
              <p className="text-xs text-slate-500">System status, usage &amp; PRC license checks</p>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <LogOut size={16} /> Log out
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 md:px-8" aria-label="Admin sections">
          {(
            [
              ["overview", "Overview", LayoutDashboard],
              ["therapists", "Therapists", Users],
              ["system", "System", Info],
              ["defense", "Defense Q&A", GraduationCap],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              aria-current={tab === value ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === value ? "border-teal-600 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        {tab === "overview" ? (
          <AdminOverview />
        ) : tab === "therapists" ? (
          <TherapistsTab />
        ) : tab === "system" ? (
          <AdminSystemInfo />
        ) : (
          <DefenseQA />
        )}
      </main>
    </div>
  );
}

/** Therapist accounts and their PRC license checks. */
function TherapistsTab() {
  const { success, error } = useToast();
  const [filter, setFilter] = useState<AdminFilter>("pending");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [therapists, setTherapists] = useState<AdminTherapist[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Loading = the list for the current filter/search/refresh hasn't arrived yet.
  const [refreshes, setRefreshes] = useState(0);
  const requestKey = `${filter}|${query}|${refreshes}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listTherapists({ status: filter, search: query })
      .then((res) => {
        if (cancelled) return;
        setSummary(res.data.summary);
        setTherapists(res.data.therapists);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Couldn't load therapist accounts.");
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, query, requestKey]);

  const refresh = useCallback(() => setRefreshes((n) => n + 1), []);

  // After an action, update the card in place; reload counts (the card may leave this filter).
  const handleChanged = (updated: AdminTherapist) => {
    setTherapists((prev) => prev.map((t) => (t.user_id === updated.user_id ? { ...t, ...updated } : t)));
    void adminApi.listTherapists({ status: filter, search: query }).then((res) => setSummary(res.data.summary)).catch(() => {});
  };

  return (
    <div className="space-y-5">
        <p className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          <span>
            Check each license on the PRC verification service (search <b>Verification of License — By Name</b> with the profession and the name on
            the PRC ID), then compare the license number. This page shows account details only — no patient information.
          </span>
        </p>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter accounts">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter === f.value ? "bg-teal-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
              {summary && <span className="ml-1.5 opacity-75">{f.count(summary)}</span>}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or license number"
              aria-label="Search accounts"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
            />
          </div>
          <button type="submit" className="rounded-lg bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100">
            Search
          </button>
          <button type="button" onClick={refresh} className="rounded-lg bg-white px-3 text-slate-600 shadow-sm hover:bg-slate-100" aria-label="Refresh">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </form>

        {loadError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}

        {!loading && !loadError && therapists.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No accounts here{query ? ` matching “${query}”` : ""}.
          </p>
        )}

        <div className="space-y-3">
          {therapists.map((t) => (
            <TherapistAccountCard
              key={t.user_id}
              therapist={t}
              onChanged={handleChanged}
              onMessage={(text, kind) => (kind === "success" ? success(text) : error(text))}
            />
          ))}
        </div>
    </div>
  );
}
