import {
  BookOpenText,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ScanLine,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PAGES } from "@/endpoints";
import { useSessionUser } from "@/hooks/use-session-user";
import { firstNameFromDisplayName } from "@/lib/ops-user-display";
import { canOpsRoleStartNewInspection, isOpsManagerRole } from "@/lib/ops-role";
import { getInspectionsPendingManagerReview } from "@/pages/dashboard/inspections/inspection-service";

export default function OpsHomePage() {
  const navigate = useNavigate();
  const sessionUser = useSessionUser();
  const [pendingReviewCount, setPendingReviewCount] = useState<number | null>(
    null,
  );
  const [reviewCountFailed, setReviewCountFailed] = useState(false);

  const greetingLead = useMemo(() => {
    return firstNameFromDisplayName(sessionUser?.name) ?? "there";
  }, [sessionUser?.name]);

  const isManager = isOpsManagerRole(sessionUser?.role);
  const canNewInspection = canOpsRoleStartNewInspection(sessionUser?.role);

  useEffect(() => {
    if (!isManager) return;
    let cancelled = false;
    getInspectionsPendingManagerReview()
      .then((rows) => {
        if (!cancelled) {
          setPendingReviewCount(rows.length);
          setReviewCountFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPendingReviewCount(null);
          setReviewCountFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isManager]);

  if (isManager) {
    return (
      <div className="space-y-4">
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Manager
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hi, {greetingLead} — ready to review?
          </h1>
          <p className="text-sm text-muted-foreground">
            Open the queue to approve or reject inspections your operators
            submitted.
          </p>
        </header>

        <button
          type="button"
          onClick={() => navigate(PAGES.OPS_TEAM_REVIEW)}
          className="flex w-full items-center justify-between gap-3 rounded-3xl border border-violet-500/30 bg-violet-500/10 p-4 text-left shadow-sm ring-1 ring-violet-500/15 transition-all hover:bg-violet-500/15 active:scale-[0.99]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-900 dark:text-violet-100">
                Inspection Review
              </p>
              <p className="font-mono text-2xl font-bold tabular-nums tracking-tight leading-none">
                {reviewCountFailed
                  ? "—"
                  : pendingReviewCount === null
                    ? "…"
                    : pendingReviewCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {reviewCountFailed
                  ? "Open the queue to see pending items"
                  : pendingReviewCount === 1
                    ? "Inspection needs your review."
                    : "Inspections need your review."}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>

        <section className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate(PAGES.OPS_NEW_INSPECTION_SEARCH)}
            className="group flex h-32 flex-col justify-between rounded-3xl border bg-amber-500/5 p-3 text-left shadow-sm ring-1 ring-amber-500/10 transition-all hover:-translate-y-0.5 hover:bg-amber-500/10 hover:shadow-md active:translate-y-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                Search
              </span>
              <Search className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Search inspection</p>
              <p className="text-[11px] text-muted-foreground">
                Look up a unit by barcode; open existing inspections only.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate(PAGES.OPS_HELP)}
            className="group flex h-32 flex-col justify-between rounded-3xl border bg-violet-500/5 p-3 text-left shadow-sm ring-1 ring-violet-500/10 transition-all hover:-translate-y-0.5 hover:bg-violet-500/10 hover:shadow-md active:translate-y-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                Guide
              </span>
              <BookOpenText className="h-5 w-5 text-violet-600 dark:text-violet-300" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">How to use?</p>
              <p className="text-[11px] text-muted-foreground">
                Inspection Review, Inspections tab, and general app tips.
              </p>
            </div>
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {"Today's Work"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi, {greetingLead} — ready to inspect?
        </h1>
        <p className="text-sm text-muted-foreground">
          Four quick actions to keep your warehouse in top shape.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {canNewInspection ? (
          <button
            type="button"
            onClick={() => navigate(PAGES.OPS_NEW_INSPECTION)}
            className="group flex h-32 flex-col justify-between rounded-3xl border bg-emerald-500/5 p-3 text-left shadow-sm ring-1 ring-emerald-500/10 transition-all hover:-translate-y-0.5 hover:bg-emerald-500/10 hover:shadow-md active:translate-y-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                New Scan
              </span>
              <ScanLine className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">New Inspection</p>
              <p className="text-[11px] text-muted-foreground">
                Scan and log a fresh product inspection.
              </p>
            </div>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => navigate(PAGES.OPS_TODAY_INSPECTIONS)}
          className="group flex h-32 flex-col justify-between rounded-3xl border bg-sky-500/5 p-3 text-left shadow-sm ring-1 ring-sky-500/10 transition-all hover:-translate-y-0.5 hover:bg-sky-500/10 hover:shadow-md active:translate-y-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex rounded-full bg-sky-500/15 px-2 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
              Today
            </span>
            <ClipboardList className="h-5 w-5 text-sky-600 dark:text-sky-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">{"Today's inspections"}</p>
            <p className="text-[11px] text-muted-foreground">
              Review everything logged this shift.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate(PAGES.OPS_NEW_INSPECTION_SEARCH)}
          className="group flex h-32 flex-col justify-between rounded-3xl border bg-amber-500/5 p-3 text-left shadow-sm ring-1 ring-amber-500/10 transition-all hover:-translate-y-0.5 hover:bg-amber-500/10 hover:shadow-md active:translate-y-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              Search
            </span>
            <Search className="h-5 w-5 text-amber-600 dark:text-amber-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Search Inspection</p>
            <p className="text-[11px] text-muted-foreground">
              Scan or enter the unit barcode to open existing inspections.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate(PAGES.OPS_HELP)}
          className="group flex h-32 flex-col justify-between rounded-3xl border bg-violet-500/5 p-3 text-left shadow-sm ring-1 ring-violet-500/10 transition-all hover:-translate-y-0.5 hover:bg-violet-500/10 hover:shadow-md active:translate-y-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
              Guide
            </span>
            <BookOpenText className="h-5 w-5 text-violet-600 dark:text-violet-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">How to use?</p>
            <p className="text-[11px] text-muted-foreground">
              Learn how to start, review, and complete inspections.
            </p>
          </div>
        </button>
      </section>
    </div>
  );
}
