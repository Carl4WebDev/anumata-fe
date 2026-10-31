import type { ReactNode } from "react";

/**
 * Skeleton screens: grey shapes of the page that is loading, so the layout is
 * there at once and the content fills in. Feels faster than a spinner.
 */

interface SkeletonProps {
  className?: string;
}

/** One grey placeholder block. Size and shape come from `className`. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

/** Wraps a skeleton layout; screen readers hear `label` instead of the shapes. */
function SkeletonPage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6 md:space-y-8">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function HeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-[60vw]" />
      </div>
      {withAction && <Skeleton className="h-11 w-36 rounded-lg" />}
    </div>
  );
}

function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Skeleton className="mb-3 h-9 w-9 rounded-lg" />
          <Skeleton className="mb-2 h-6 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

/** List rows: avatar circle + two text lines + a trailing pill. */
export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

function PanelSkeleton({ lines = 4, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Lists of records: patients, interview links, question sets. */
export function ListPageSkeleton({ label, withSearch = true }: { label: string; withSearch?: boolean }) {
  return (
    <SkeletonPage label={label}>
      <HeaderSkeleton withAction />
      {withSearch && <Skeleton className="h-12 w-full rounded-xl" />}
      <RowsSkeleton />
    </SkeletonPage>
  );
}

/** Stat cards on top, panels below: dashboard and reports. */
export function DashboardSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPage label={label}>
      <HeaderSkeleton />
      <StatCardsSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <PanelSkeleton lines={6} className="lg:col-span-2" />
        <PanelSkeleton lines={6} />
      </div>
    </SkeletonPage>
  );
}

/** One record in detail: patient profile, session review. */
export function DetailPageSkeleton({ label }: { label: string }) {
  return (
    <SkeletonPage label={label}>
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <StatCardsSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <PanelSkeleton lines={5} className="lg:col-span-2" />
        <PanelSkeleton lines={5} />
      </div>
    </SkeletonPage>
  );
}

/** Appointments: header, schedule panel, then appointment cards. */
export function AppointmentsSkeleton() {
  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <SkeletonPage label="Loading appointments…">
        <HeaderSkeleton withAction />
        <PanelSkeleton lines={2} />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </SkeletonPage>
    </div>
  );
}

/** A short block of text lines, for sections inside a page. */
export function TextBlockSkeleton({ lines = 3, label = "Loading…" }: { lines?: number; label?: string }) {
  return (
    <div role="status" className="space-y-2 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
