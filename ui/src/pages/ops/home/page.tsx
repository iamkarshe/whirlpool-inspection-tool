import { BookOpenText, ClipboardList, ScanLine, Search } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useSessionUser } from "@/hooks/use-session-user";
import { firstNameFromDisplayName } from "@/lib/ops-user-display";

export default function OpsHomePage() {
  const navigate = useNavigate();
  const sessionUser = useSessionUser();

  const greetingLead = useMemo(() => {
    return firstNameFromDisplayName(sessionUser?.name) ?? "there";
  }, [sessionUser?.name]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Today's Work
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi, {greetingLead} — ready to inspect?
        </h1>
        <p className="text-sm text-muted-foreground">
          Four quick actions to keep your warehouse in top shape.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate("/ops/new-inspection")}
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

        <button
          type="button"
          onClick={() => navigate("/ops/today-inspections")}
          className="group flex h-32 flex-col justify-between rounded-3xl border bg-sky-500/5 p-3 text-left shadow-sm ring-1 ring-sky-500/10 transition-all hover:-translate-y-0.5 hover:bg-sky-500/10 hover:shadow-md active:translate-y-0"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex rounded-full bg-sky-500/15 px-2 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
              Today
            </span>
            <ClipboardList className="h-5 w-5 text-sky-600 dark:text-sky-300" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Today's Inspections</p>
            <p className="text-[11px] text-muted-foreground">
              Review everything logged this shift.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/ops/data")}
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
              Look up inspection status by barcode or serial.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/ops/help")}
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
