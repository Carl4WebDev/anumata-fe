import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, ExternalLink, Brain, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Sparkles, BarChart3, CalendarDays, Camera, Trash2, Pencil, Archive, ArchiveRestore, Search, SlidersHorizontal, Phone, Mail } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import { DetailPageSkeleton } from "../../../shared/components/Skeleton";
import { useSessions } from "../../context/sessions/useSessions";
import { patientsApi } from "../../../shared/api/patientsApi";
import { followUpsApi } from "../../../shared/api/followUpsApi";
import type { FollowUp } from "../../../shared/api/followUpsApi";
import type { Patient } from "../../../shared/api/patientsApi";
import type { LongitudinalReport, DeterministicAnalysis } from "../../../shared/types/session";
import type { MappedSession } from "../../../shared/types/session";
import CollapsibleSection from "../../../shared/components/CollapsibleSection";
import Avatar from "../../../shared/components/Avatar";
import EmotionTransitionHeatmap from "../components/EmotionTransitionHeatmap";
import FollowUpSection from "../components/FollowUpSection";
import PatientAppointmentsSection from "../../appointments/components/PatientAppointmentsSection";
import GenerateLinkModal from "../../interviewLinks/modals/GenerateLinkModal";
import EditPatientModal from "../modals/EditPatientModal";
import {
  filterHistory,
  countActiveFilters,
  EMPTY_HISTORY_FILTERS,
  HISTORY_PAGE_SIZE,
  type HistoryFilters,
} from "../utils/historyFilters";
import { useInterviewLinks } from "../../context/interviewLinks/useInterviewLinks";
import { useToast } from "../../../shared/context/ToastContext";
import { reminderEmailsEnabled } from "../../../shared/constants/features";

/** Downscale an image file to a square PNG data URL of the given size. */
function resizeImage(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas unavailable"));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    img.src = url;
  });
}

export default function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, loading: patientsLoading, updatePatient, setArchived, setProfileImage } = usePatients();
  const { sessions } = useSessions();
  const { generateLink } = useInterviewLinks();
  const { success: toastSuccess, error: toastError } = useToast();
  const patient = patients.find((p) => p.id === Number(id));

  // Generate interview link modal
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Edit patient modal
  const [showEditModal, setShowEditModal] = useState(false);

  // Profile image state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSaving, setImageSaving] = useState(false);
  // Optimistic photo: shown at once while it saves; dropped again if saving fails.
  const [photoOverride, setPhotoOverride] = useState<{ src: string | null } | null>(null);

  // Full patient details from API (includes longitudinal_report)
  const [fullPatient, setFullPatient] = useState<Patient | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Longitudinal report generation state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Follow-ups state — tracked for interview-history notification + next-follow-up stat
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  const fetchFollowUps = useCallback(async () => {
    if (!id) return;
    try {
      const res = await followUpsApi.getByPatientId(Number(id));
      setFollowUps(res.data);
    } catch {
      // follow-up fetch failed — non-critical
    }
  }, [id]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Follow-ups and appointments affect each other; any change refreshes both
  // sections plus the follow-up data used by the interview history.
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const handleScheduleChanged = useCallback(() => {
    setScheduleVersion((v) => v + 1);
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Interview history — search / filter / pagination
  const [historyFiltersOpen, setHistoryFiltersOpen] = useState(false);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>(EMPTY_HISTORY_FILTERS);
  const [historyPage, setHistoryPage] = useState(1);

  const updateHistoryFilters = (patch: Partial<HistoryFilters>) =>
    setHistoryFilters((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilters]);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patterns: true,
    changes: true,
    indicators: true,
    attention: true,
    focus: true,
    questions: true,
    highlights: true,
    evidence: false,
    limitations: false,
  });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Fetch full patient details (including longitudinal_report) from API
  const fetchPatientDetails = useCallback(async () => {
    if (!id) return;
    setFetchingDetails(true);
    try {
      const res = await patientsApi.getById(Number(id));
      setFullPatient(res.data);
    } catch {
      // Patient details fetch failed — page still works with context data
    } finally {
      setFetchingDetails(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatientDetails();
  }, [fetchPatientDetails]);

  // Generate longitudinal report
  const handleGenerate = useCallback(async () => {
    if (!id) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await patientsApi.generateLongitudinalReport(Number(id));
      setFullPatient((prev) =>
        prev ? { ...prev, longitudinal_report: res.data } : prev
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate summary";
      setGenerateError(message);
    } finally {
      setGenerating(false);
    }
  }, [id]);

  // Profile image — client-side resize to keep base64 payload small
  const handleImagePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !id) return;
    if (!file.type.startsWith("image/")) {
      toastError("Please choose an image file.");
      return;
    }
    setImageSaving(true);
    try {
      const dataUrl = await resizeImage(file, 256);
      setPhotoOverride({ src: dataUrl });
      const res = await setProfileImage(Number(id), dataUrl);
      if (res.ok) {
        toastSuccess("Profile photo updated.");
        fetchPatientDetails();
      } else if (res.error) {
        toastError(`${res.error} The previous photo was kept.`);
      }
    } catch {
      toastError("Failed to process image.");
    } finally {
      setPhotoOverride(null);
      setImageSaving(false);
    }
  }, [id, setProfileImage, toastSuccess, toastError, fetchPatientDetails]);

  const handleImageRemove = useCallback(async () => {
    if (!id) return;
    setImageSaving(true);
    setPhotoOverride({ src: null });
    try {
      const res = await setProfileImage(Number(id), null);
      if (res.ok) {
        toastSuccess("Profile photo removed.");
        fetchPatientDetails();
      } else if (res.error) {
        toastError(`${res.error} The photo was kept.`);
      }
    } finally {
      setPhotoOverride(null);
      setImageSaving(false);
    }
  }, [id, setProfileImage, toastSuccess, toastError, fetchPatientDetails]);

  // Edit patient details
  const handleSaveEdit = useCallback(async (data: {
    f_name: string;
    m_name?: string;
    l_name: string;
    age: number;
    gender: string;
    primary_concern: string;
    contact_number: string;
    email: string;
    reminder_consent: boolean;
  }) => {
    if (!id) return { ok: false, error: "Missing patient id" };
    const res = await updatePatient(Number(id), data);
    if (res.ok) {
      toastSuccess("Patient details updated.");
      fetchPatientDetails();
    }
    return res;
  }, [id, updatePatient, toastSuccess, fetchPatientDetails]);

  // Archive / restore
  const handleArchiveToggle = useCallback(async () => {
    if (!id || !patient) return;
    const next = !patient.isArchived;
    const res = await setArchived(Number(id), next);
    if (res.ok) {
      toastSuccess(next ? "Patient archived." : "Patient restored.");
      fetchPatientDetails();
    } else if (res.error) {
      toastError(res.error);
    }
  }, [id, patient, setArchived, toastSuccess, toastError, fetchPatientDetails]);

  if (!patient && patientsLoading) {
    return <DetailPageSkeleton label="Loading patient…" />;
  }

  if (!patient) {
    return (
      <div className="space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-teal-600 hover:underline">
          <ArrowLeft size={16} />
          Back to Patients
        </Link>
        <p className="text-slate-500">Patient not found.</p>
      </div>
    );
  }

  const patientSessions = sessions.filter((s) => s.patientId === patient.id);

  // Compute latest emotion averages from sessions
  const avgEmotions = patientSessions.length > 0
    ? {
        sad: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.sad, 0) / patientSessions.length),
        happy: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.happy, 0) / patientSessions.length),
        angry: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.angry, 0) / patientSessions.length),
        neutral: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.neutral, 0) / patientSessions.length),
      }
    : null;

  const emotionColors: Record<string, string> = {
    sad: "bg-blue-500",
    happy: "bg-green-500",
    angry: "bg-red-500",
    neutral: "bg-slate-400",
  };

  // Compute emotion transitions for heatmap
  const sessionTransitions = patientSessions
    .filter((s) => s.responses.length >= 2)
    .map((s) => ({
      sessionId: s.id,
      sessionLabel: `${s.date} — ${s.templateName}`,
      transitions: s.responses.slice(0, -1).map((r, i) => ({
        from: r.emotion || "neutral",
        to: s.responses[i + 1].emotion || "neutral",
        fromPct: r.emotionPct || 0,
        toPct: s.responses[i + 1].emotionPct || 0,
      })),
    }));

  const longitudinalReport: LongitudinalReport | null | undefined =
    fullPatient?.longitudinal_report ?? null;

  const hasCompletedSessions = patientSessions.length > 0;

  // Follow-up computed values
  const nextFollowUp = followUps
    .filter((f) => (f.status === "recommended" || f.status === "scheduled") && new Date(f.recommended_date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.recommended_date).getTime() - new Date(b.recommended_date).getTime())[0] || null;

  const followUpBySessionId = new Map<number | string, FollowUp>(
    followUps.filter((f) => f.session_id).map((f): [number | string, FollowUp] => [f.session_id!, f])
  );

  // Interview history — filtered + paginated view
  const historyEntries = patientSessions.map((session: MappedSession) => ({
    session,
    followUp: followUpBySessionId.get(session.id),
  }));
  const filteredHistory = filterHistory(historyEntries, historyFilters);
  const historyPageCount = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, historyPageCount);
  const pagedHistory = filteredHistory.slice(
    (safeHistoryPage - 1) * HISTORY_PAGE_SIZE,
    safeHistoryPage * HISTORY_PAGE_SIZE,
  );
  const activeHistoryFilterCount = countActiveFilters(historyFilters);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/patients" className="mb-2 inline-flex items-center gap-2 text-sm text-teal-600 hover:underline">
            <ArrowLeft size={16} />
            Back to Patients
          </Link>
          <div className="flex items-center gap-4">
            {/* Profile image with hover controls */}
            <div className="group relative">
              <Avatar name={patient.name} src={photoOverride ? photoOverride.src : patient.profileImage} size="xl" />
              {imageSaving && (
                <span
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow"
                  title="Saving photo…"
                >
                  <RefreshCw size={14} className="animate-spin text-teal-600" />
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload photo"
                  className="rounded-full bg-white/90 p-1.5 text-slate-700 hover:bg-white"
                >
                  <Camera size={14} />
                </button>
                {patient.profileImage && (
                  <button
                    onClick={handleImageRemove}
                    title="Remove photo"
                    className="rounded-full bg-white/90 p-1.5 text-red-600 hover:bg-white"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImagePick}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{patient.name}</h1>
                {patient.isArchived && (
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Archived
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {patient.age} &middot; {patient.gender} &middot; {patient.concern}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {patient.contactNumber || patient.email ? (
                  <>
                    {patient.contactNumber && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {patient.contactNumber}
                      </span>
                    )}
                    {patient.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {patient.email}
                        {reminderEmailsEnabled() && (
                          <span className={patient.reminderConsent ? "text-teal-700" : "text-slate-400"}>
                            {patient.reminderConsent ? "· reminders on" : "· no reminder consent"}
                          </span>
                        )}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400">No contact for reminders yet — add one with Edit.</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil size={16} />
            Edit
          </button>
          <button
            onClick={handleArchiveToggle}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
              patient.isArchived
                ? "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {patient.isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            {patient.isArchived ? "Restore" : "Archive"}
          </button>
          <button
            onClick={() => setShowLinkModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            <Link2 size={18} />
            Generate Interview Link
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-5">
        {[
          { label: "Status", value: patient.status },
          { label: "Latest Risk Indicator", value: patient.risk, color: patient.risk === "High" ? "text-red-600" : patient.risk === "Moderate" ? "text-amber-600" : patient.risk === "Low" ? "text-emerald-600" : "" },
          { label: "Total Sessions", value: String(patientSessions.length) },
          { label: "Last Interview", value: patientSessions.length > 0 ? patientSessions[0].date : "N/A" },
          { label: "Next Follow-up", value: nextFollowUp ? new Date(nextFollowUp.recommended_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "None", color: nextFollowUp ? "text-teal-600" : "text-slate-400" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 hover:shadow-md transition-shadow">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{card.label}</p>
            <h3 className={`mt-1 text-lg font-semibold md:mt-2 md:text-xl ${card.color ?? "text-slate-900"}`}>{card.value}</h3>
          </div>
        ))}
      </section>

      {/* AI-Assisted Progress Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <Brain size={20} className="text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI-Assisted Progress Summary</h2>
              <p className="text-xs text-slate-500">Cross-session emotional pattern analysis</p>
            </div>
          </div>
          {hasCompletedSessions && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={generating ? "animate-spin" : ""} />
              {generating ? "Generating..." : longitudinalReport ? "Regenerate" : "Generate Summary"}
            </button>
          )}
        </div>

        {/* Error state */}
        {generateError && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Generation failed</p>
              <p className="mt-0.5 text-xs text-red-600">{generateError}</p>
            </div>
          </div>
        )}

        <CollapsibleSection
          title={longitudinalReport ? "View Summary" : "Details"}
          defaultOpen={false}
          className=""
          titleClassName="text-xs font-medium text-slate-500"
        >
          {/* No completed sessions */}
          {!hasCompletedSessions && (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <Brain size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                Complete at least one interview to generate a progress summary.
              </p>
            </div>
          )}

          {/* Loading state */}
          {hasCompletedSessions && fetchingDetails && !longitudinalReport && (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <RefreshCw size={24} className="mx-auto animate-spin text-slate-400" />
              <p className="mt-3 text-sm text-slate-500">Loading summary...</p>
            </div>
          )}

          {/* Report content */}
          {hasCompletedSessions && longitudinalReport && (
            <LongitudinalReportContent
              report={longitudinalReport}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
            />
          )}

          {/* Empty state — sessions exist but no report generated yet */}
          {hasCompletedSessions && !fetchingDetails && !longitudinalReport && !generating && !generateError && (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <Brain size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No summary generated yet. Click &quot;Generate Summary&quot; to create an AI-assisted progress analysis.
              </p>
            </div>
          )}
        </CollapsibleSection>
      </section>

      {/* Content: Interview History + Emotional Trend */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-5">
            <h2 className="text-base font-semibold text-slate-900">Interview History</h2>
            {patientSessions.length > 0 && (
              <button
                onClick={() => setHistoryFiltersOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <SlidersHorizontal size={14} />
                Search &amp; Filter
                {activeHistoryFilterCount > 0 && (
                  <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {activeHistoryFilterCount}
                  </span>
                )}
                {historyFiltersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>

          {/* Collapsible search & filter panel */}
          {historyFiltersOpen && patientSessions.length > 0 && (
            <div className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <Search size={18} className="shrink-0 text-slate-400" />
                <input
                  value={historyFilters.search}
                  onChange={(e) => updateHistoryFilters({ search: e.target.value })}
                  placeholder="Search by interview type, date, or follow-up"
                  className="w-full text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={historyFilters.risk}
                  onChange={(e) => updateHistoryFilters({ risk: e.target.value as HistoryFilters["risk"] })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">All risk levels</option>
                  <option value="Low">Low risk</option>
                  <option value="Moderate">Moderate risk</option>
                  <option value="High">High risk</option>
                </select>
                <select
                  value={historyFilters.followUp}
                  onChange={(e) => updateHistoryFilters({ followUp: e.target.value as HistoryFilters["followUp"] })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="all">All follow-ups</option>
                  <option value="has">Has follow-up</option>
                  <option value="overdue">Overdue follow-up</option>
                  <option value="none">No follow-up</option>
                </select>
                <input
                  type="date"
                  value={historyFilters.dateFrom}
                  onChange={(e) => updateHistoryFilters({ dateFrom: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <input
                  type="date"
                  value={historyFilters.dateTo}
                  onChange={(e) => updateHistoryFilters({ dateTo: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              {activeHistoryFilterCount > 0 && (
                <button
                  onClick={() => setHistoryFilters(EMPTY_HISTORY_FILTERS)}
                  className="text-xs font-medium text-teal-600 hover:text-teal-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {patientSessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No interviews yet. Generate an interview link to get started.</p>
          ) : filteredHistory.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">No interviews match your search.</p>
              <button
                onClick={() => setHistoryFilters(EMPTY_HISTORY_FILTERS)}
                className="mt-2 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {pagedHistory.map(({ session, followUp }) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-teal-200 hover:bg-teal-50/30"
                  >
                    <div>
                      <span className="text-sm font-medium">{session.templateName}</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-400">{session.date}</span>
                        <span className="text-xs text-slate-300">&middot;</span>
                        <span className="text-xs text-slate-400">{session.duration}</span>
                        {followUp && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                            <CalendarDays size={12} />
                            Patient advised to come back on {new Date(followUp.recommended_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            session.riskLevel === "High"
                              ? "bg-red-50 text-red-700"
                              : session.riskLevel === "Moderate"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {session.riskLevel}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/sessions/${session.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700"
                    >
                      Review
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                ))}
              </div>

              {/* Pagination — shown only when history spans multiple pages */}
              {historyPageCount > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={safeHistoryPage <= 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500">
                    Page {safeHistoryPage} of {historyPageCount}
                  </span>
                  <button
                    onClick={() => setHistoryPage((p) => Math.min(historyPageCount, p + 1))}
                    disabled={safeHistoryPage >= historyPageCount}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900 md:mb-5">Emotional Indicator Trend</h2>
          {avgEmotions ? (
            <div className="space-y-4">
              {Object.entries(avgEmotions)
                .sort(([, a], [, b]) => b - a)
                .map(([label, pct]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize">{label}</span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${emotionColors[label] ?? "bg-slate-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No emotion data yet.</p>
          )}
        </div>
      </section>

      {/* Follow-up recommendations — booking one creates an appointment below */}
      <FollowUpSection patientId={patient.id} refreshKey={scheduleVersion} onChanged={handleScheduleChanged} />

      {/* Appointments — closing one also updates the follow-up it was booked from */}
      <PatientAppointmentsSection patientId={patient.id} refreshKey={scheduleVersion} onChanged={handleScheduleChanged} />

      {/* Emotion Transition Heatmap */}
      <EmotionTransitionHeatmap
        sessions={sessionTransitions}
        onCellClick={(sessionId) => navigate(`/sessions/${sessionId}`)}
      />

      {/* Generate Interview Link modal — patient pre-selected */}
      <GenerateLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onGenerate={generateLink}
        defaultPatientId={patient.id}
      />

      {/* Edit Patient modal — mounted fresh each open so initial values re-seed */}
      {fullPatient && showEditModal && (
        <EditPatientModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          initial={{
            f_name: fullPatient.f_name,
            m_name: fullPatient.m_name,
            l_name: fullPatient.l_name,
            age: fullPatient.age,
            gender: fullPatient.gender.charAt(0).toUpperCase() + fullPatient.gender.slice(1),
            primary_concern: fullPatient.primary_concern,
            contact_number: fullPatient.contact_number ?? null,
            email: fullPatient.email ?? null,
            reminder_consent: Boolean(fullPatient.reminder_consent),
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

// =============================================================================
// Longitudinal Report Display
//
// Two-layer architecture:
// - Deterministic findings are ALWAYS shown (from _deterministic_analysis)
// - LLM interpretation is shown when available (report_source === "llm")
// - When LLM is unavailable, shows "Evidence-Based Summary" indicator
//
// Data flow:
//   Backend computes _compute_longitudinal_analysis() → structured findings
//   LLM optionally interprets → therapist-friendly narrative
//   Frontend displays both layers with clear source indication
// =============================================================================

function SourceIndicator({ reportSource }: { reportSource?: string }) {
  const isLLM = reportSource === "llm";
  const isDeterministic = reportSource === "deterministic";

  if (isLLM) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
        <Sparkles size={14} className="text-teal-600" />
        <span className="text-xs font-medium text-teal-800">AI-Assisted Interpretation</span>
        <span className="text-xs text-teal-600">— Interpretation generated from the patient's longitudinal session data and detected emotional indicators.</span>
      </div>
    );
  }

  if (isDeterministic) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <BarChart3 size={14} className="text-amber-600" />
        <span className="text-xs font-medium text-amber-800">Evidence-Based Summary</span>
        <span className="text-xs text-amber-600">— AI interpretation is temporarily unavailable. Findings are based on recorded session data and detected emotional indicators.</span>
      </div>
    );
  }

  // Legacy fallback
  if (reportSource === "fallback") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <BarChart3 size={14} className="text-amber-600" />
        <span className="text-xs font-medium text-amber-800">Evidence-Based Summary</span>
        <span className="text-xs text-amber-600">— AI interpretation is temporarily unavailable.</span>
      </div>
    );
  }

  return null;
}

interface ReportSectionProps {
  title: string;
  icon: string;
  items: string[];
  expanded: boolean;
  onToggle: () => void;
  color?: string;
  children?: React.ReactNode;
}

function ReportSection({ title, icon, items, expanded, onToggle, color = "slate", children }: ReportSectionProps) {
  if ((!items || items.length === 0) && !children) return null;

  const colorClasses: Record<string, string> = {
    slate: "border-slate-200",
    amber: "border-amber-200 bg-amber-50/30",
    green: "border-green-200 bg-green-50/30",
    teal: "border-teal-200 bg-teal-50/30",
    red: "border-red-200 bg-red-50/30",
  };

  const itemCount = items?.length ?? 0;

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] ?? colorClasses.slate}`}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span>{icon}</span>
          {title}
          {itemCount > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{itemCount}</span>
          )}
        </span>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {expanded && (
        <div className="mt-3">
          {items && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// Session Highlight Card — for structured highlight data
function SessionHighlightCard({ highlight }: { highlight: DeterministicAnalysis["session_highlights"][0] }) {
  const typeColors: Record<string, string> = {
    most_significant_event: "border-red-200 bg-red-50/50",
    most_recent_concern: "border-amber-200 bg-amber-50/50",
    most_consistent_pattern: "border-green-200 bg-green-50/50",
  };

  return (
    <div className={`rounded-lg border p-3 ${typeColors[highlight.type] ?? "border-slate-200"}`}>
      <p className="text-xs font-semibold text-slate-600">{highlight.label}</p>
      {highlight.session && (
        <p className="mt-1 text-xs text-slate-500">{highlight.session}{highlight.date ? ` — ${new Date(highlight.date).toLocaleDateString()}` : ""}</p>
      )}
      {highlight.detail && (
        <p className="mt-1 text-sm text-slate-800">{highlight.detail}</p>
      )}
      {highlight.intensity && (
        <p className="mt-0.5 text-xs text-slate-500">Intensity: {highlight.intensity}</p>
      )}
    </div>
  );
}

// Distribution change row — shows early → recent with arrow
function DistributionChangeRow({ change }: { change: NonNullable<DeterministicAnalysis["session_changes"][0]["details"]>[0] }) {
  const arrowColor = change.direction === "increased" ? "text-green-600" : "text-red-600";
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm capitalize text-slate-700">{change.emotion}</span>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">{change.early}%</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-700 font-medium">{change.recent}%</span>
        <span className={`font-semibold ${arrowColor}`}>{change.arrow}</span>
      </div>
    </div>
  );
}

interface LongitudinalReportContentProps {
  report: LongitudinalReport;
  expandedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
}

function LongitudinalReportContent({ report, expandedSections, toggleSection }: LongitudinalReportContentProps) {
  // Use structured data when available (from deterministic analysis)
  const analysis = report._deterministic_analysis;

  return (
    <div className="space-y-4">
      {/* Source indicator — LLM vs Deterministic */}
      <SourceIndicator reportSource={report.report_source} />

      {/* Overall Summary */}
      {report.overall_summary && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
          <p className="text-sm leading-relaxed text-slate-800">{report.overall_summary}</p>
        </div>
      )}

      {/* Session Highlights — structured when available */}
      {analysis && analysis.session_highlights && analysis.session_highlights.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <button
            onClick={() => toggleSection("highlights")}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span>⭐</span>
              Session Highlights
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{analysis.session_highlights.length}</span>
            </span>
            {expandedSections.highlights ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {expandedSections.highlights && (
            <div className="mt-3 space-y-2">
              {analysis.session_highlights.map((h, i) => (
                <SessionHighlightCard key={i} highlight={h} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report sections grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Emotional Patterns — with supporting sessions from structured data */}
        <ReportSection
          title="Recurring Emotional Patterns"
          icon="📊"
          items={report.emotional_patterns}
          expanded={expandedSections.patterns}
          onToggle={() => toggleSection("patterns")}
          color="teal"
        >
          {analysis && analysis.emotional_patterns.length > 0 && (
            <div className="mt-3 space-y-2">
              {analysis.emotional_patterns.map((p, i) => (
                <div key={i} className="rounded-lg bg-teal-50/50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{p.pattern}</span>
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">{p.frequency}</span>
                  </div>
                  {p.supporting_sessions.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Supporting: {p.supporting_sessions.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Recent Changes — with structured distribution comparison */}
        <ReportSection
          title="Recent Changes"
          icon="🔄"
          items={report.session_changes}
          expanded={expandedSections.changes}
          onToggle={() => toggleSection("changes")}
          color="green"
        >
          {analysis && analysis.session_changes.length > 0 && (
            <div className="mt-3 space-y-3">
              {analysis.session_changes.map((change, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-slate-600">{change.label}</p>
                  {change.type === "distribution" && change.details && (
                    <div className="mt-1.5 space-y-1">
                      {change.details.map((d, j) => (
                        <DistributionChangeRow key={j} change={d} />
                      ))}
                    </div>
                  )}
                  {change.type === "risk" && change.detail && (
                    <p className="mt-1 text-sm text-slate-700">{change.detail}</p>
                  )}
                  {change.type === "spikes" && change.detail && (
                    <p className="mt-1 text-sm text-slate-700">{change.detail}</p>
                  )}
                  {change.type === "insufficient_data" && change.detail && (
                    <p className="mt-1 text-sm text-slate-500 italic">{change.detail}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Recurring Indicators — with supporting sessions */}
        <ReportSection
          title="Recurring Indicators"
          icon="🔁"
          items={report.recurring_indicators}
          expanded={expandedSections.indicators}
          onToggle={() => toggleSection("indicators")}
        >
          {analysis && analysis.recurring_indicators.length > 0 && (
            <div className="mt-3 space-y-2">
              {analysis.recurring_indicators.map((ind, i) => (
                <div key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-800">{ind.indicator}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">{ind.frequency}x</span>
                  </div>
                  {ind.supporting_sessions.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Detected in: {ind.supporting_sessions.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Areas for Attention — with severity and session references */}
        <ReportSection
          title="Areas for Attention"
          icon="⚠️"
          items={report.areas_for_attention}
          expanded={expandedSections.attention}
          onToggle={() => toggleSection("attention")}
          color="amber"
        >
          {analysis && analysis.areas_for_attention.length > 0 && (
            <div className="mt-3 space-y-2">
              {analysis.areas_for_attention.map((area, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 ${
                  area.severity === "high" ? "bg-red-50 border border-red-200" :
                  area.severity === "moderate" ? "bg-amber-50 border border-amber-200" :
                  "bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2">
                    {area.severity === "high" && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    {area.severity === "moderate" && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                    <span className="text-sm text-slate-800">{area.area}</span>
                  </div>
                  {area.sessions.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">Sessions: {area.sessions.join(", ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Suggested Therapist Focus */}
        <ReportSection
          title="Suggested Therapist Focus"
          icon="🎯"
          items={report.therapist_focus}
          expanded={expandedSections.focus}
          onToggle={() => toggleSection("focus")}
        />

        {/* Suggested Follow-Up Questions */}
        <ReportSection
          title="Suggested Follow-Up Questions"
          icon="💬"
          items={report.suggested_follow_up_questions}
          expanded={expandedSections.questions}
          onToggle={() => toggleSection("questions")}
          color="teal"
        />
      </div>

      {/* Evidence Quality — with per-modality breakdown */}
      {report.evidence_quality && (
        <div className="rounded-xl border border-slate-200 p-4">
          <button
            onClick={() => toggleSection("evidence")}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span>📋</span>
              Evidence Quality
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  report.evidence_quality.overall === "strong"
                    ? "bg-green-100 text-green-700"
                    : report.evidence_quality.overall === "moderate"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {report.evidence_quality.overall}
              </span>
            </span>
            {expandedSections.evidence ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {expandedSections.evidence && (
            <div className="mt-3 space-y-2">
              {/* Per-modality breakdown */}
              {(report.evidence_quality.fer || report.evidence_quality.ser || report.evidence_quality.ler) && (
                <div className="grid grid-cols-3 gap-2">
                  {report.evidence_quality.fer && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                      <p className="text-xs text-slate-500">FER</p>
                      <p className="text-sm font-medium text-slate-700">{report.evidence_quality.fer}</p>
                    </div>
                  )}
                  {report.evidence_quality.ser && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                      <p className="text-xs text-slate-500">SER</p>
                      <p className="text-sm font-medium text-slate-700">{report.evidence_quality.ser}</p>
                    </div>
                  )}
                  {report.evidence_quality.ler && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                      <p className="text-xs text-slate-500">LER</p>
                      <p className="text-sm font-medium text-slate-700">{report.evidence_quality.ler}</p>
                    </div>
                  )}
                </div>
              )}
              {report.evidence_quality.notes && (
                <p className="text-sm text-slate-600">{report.evidence_quality.notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Limitations */}
      {report.limitations && report.limitations.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <button
            onClick={() => toggleSection("limitations")}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span>⚠️</span>
              Limitations
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{report.limitations.length}</span>
            </span>
            {expandedSections.limitations ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {expandedSections.limitations && (
            <ul className="mt-3 space-y-2">
              {report.limitations.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Generated timestamp */}
      {report.generated_at && (
        <p className="text-right text-xs text-slate-400">
          Generated: {new Date(report.generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
