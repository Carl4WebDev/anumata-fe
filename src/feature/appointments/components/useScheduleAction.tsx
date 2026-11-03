import { useState } from "react";
import { ApiError } from "../../../shared/api/httpClient";
import ScheduleConflictWarning, { type ScheduleConflict } from "./ScheduleConflictWarning";
import { useToast } from "../../../shared/context/ToastContext";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

interface PendingConflict {
  message: string;
  conflicts: ScheduleConflict[];
  saveAnyway: () => void;
}

/**
 * Runs a schedule change, refreshes the page data and reports via toast.
 * `fn(confirm)`: if the server says the change clashes with booked
 * appointments, nothing is saved; `conflict` then lists them, and
 * `conflict.saveAnyway()` repeats the change with confirm = true.
 */
export function useScheduleAction(onChanged: () => Promise<void>) {
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState<PendingConflict | null>(null);

  const run = async (
    fn: (confirm: boolean) => Promise<unknown>,
    message: string,
    onSaved?: () => void,
    confirm = false,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await fn(confirm);
      setConflict(null);
      await onChanged();
      success(message);
      onSaved?.();
      return true;
    } catch (err) {
      const conflicts = (err as ApiError)?.details as { conflicts?: ScheduleConflict[] } | undefined;
      if (err instanceof ApiError && err.code === "SCHEDULE_CONFLICT" && conflicts?.conflicts) {
        setConflict({ message: err.message, conflicts: conflicts.conflicts, saveAnyway: () => void run(fn, message, onSaved, true) });
      } else {
        error(errorMessage(err));
      }
      return false;
    } finally {
      setBusy(false);
    }
  };
  const conflictWarning = conflict && (
    <ScheduleConflictWarning
      message={conflict.message}
      conflicts={conflict.conflicts}
      busy={busy}
      onConfirm={conflict.saveAnyway}
      onCancel={() => setConflict(null)}
    />
  );
  return { busy, run, conflictWarning };
}
