import { PAGES } from "@/endpoints";
import { useSessionUser } from "@/hooks/use-session-user";
import { isOpsManagerRole } from "@/lib/ops-role";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getInspectionKpis,
  type InspectionKpis,
} from "@/pages/dashboard/inspections/inspection-service";
import { formatCalendarDateForApi } from "@/services/inspections-api";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

function localYmd(d: Date): string {
  return formatCalendarDateForApi(d);
}

function rangeToday(): { from: string; to: string } {
  const d = new Date();
  const s = localYmd(d);
  return { from: s, to: s };
}

function rangeYesterday(): { from: string; to: string } {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const s = localYmd(d);
  return { from: s, to: s };
}

function rangeThisWeek(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  return { from: localYmd(start), to: localYmd(now) };
}

function rangeThisMonth(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: localYmd(start), to: localYmd(now) };
}

function formatKpiCount(k: InspectionKpis | null, loading: boolean): string {
  if (loading) return "…";
  if (!k) return "—";
  return String(k.totalInspections);
}

type RangeKpis = {
  today: InspectionKpis | null;
  yesterday: InspectionKpis | null;
  week: InspectionKpis | null;
  month: InspectionKpis | null;
};

export default function OpsDataPage() {
  const sessionUser = useSessionUser();
  if (isOpsManagerRole(sessionUser?.role)) {
    return <Navigate to={PAGES.OPS_TEAM} replace />;
  }
  return <OpsDataPageContent />;
}

function OpsDataPageContent() {
  const navigate = useNavigate();
  const [customOpen, setCustomOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [kpis, setKpis] = useState<RangeKpis>({
    today: null,
    yesterday: null,
    week: null,
    month: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKpis = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const opts = signal ? { signal } : undefined;
    try {
      const t = rangeToday();
      const y = rangeYesterday();
      const w = rangeThisWeek();
      const m = rangeThisMonth();
      const [today, yesterday, week, month] = await Promise.all([
        getInspectionKpis(t.from, t.to, opts),
        getInspectionKpis(y.from, y.to, opts),
        getInspectionKpis(w.from, w.to, opts),
        getInspectionKpis(m.from, m.to, opts),
      ]);
      setKpis({ today, yesterday, week, month });
    } catch (e: unknown) {
      if (signal?.aborted) return;
      setError(
        e instanceof Error ? e.message : "Could not load inspection KPIs.",
      );
      setKpis({ today: null, yesterday: null, week: null, month: null });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadKpis(ac.signal);
    return () => ac.abort();
  }, [loadKpis]);

  const goToInspections = (range: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    params.set("range", range);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    navigate(`/ops/today-inspections?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void loadKpis()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => goToInspections("today")}
          className="group rounded-3xl border bg-emerald-500/5 p-3 text-left shadow-sm ring-1 ring-emerald-500/10 transition-colors hover:bg-emerald-500/10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Today
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatKpiCount(kpis.today, loading)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => goToInspections("yesterday")}
          className="group rounded-3xl border bg-sky-500/5 p-3 text-left shadow-sm ring-1 ring-sky-500/10 transition-colors hover:bg-sky-500/10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
            Yesterday
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatKpiCount(kpis.yesterday, loading)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => goToInspections("week")}
          className="group rounded-3xl border bg-amber-500/5 p-3 text-left shadow-sm ring-1 ring-amber-500/10 transition-colors hover:bg-amber-500/10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
            This week
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatKpiCount(kpis.week, loading)}
          </p>
        </button>
        <button
          type="button"
          onClick={() => goToInspections("month")}
          className="group rounded-3xl border bg-violet-500/5 p-3 text-left shadow-sm ring-1 ring-violet-500/10 transition-colors hover:bg-violet-500/10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            This month
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatKpiCount(kpis.month, loading)}
          </p>
        </button>
      </section>

      <section>
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="flex w-full items-center justify-between rounded-3xl border bg-muted/40 px-3 py-3 text-left text-sm shadow-sm transition-colors hover:bg-muted"
        >
          <p className="text-sm font-semibold">Custom range</p>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </section>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="w-20 text-xs font-medium">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="h-9 flex-1 rounded-md border bg-background px-2 text-sm outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="w-20 text-xs font-medium">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="h-9 flex-1 rounded-md border bg-background px-2 text-sm outline-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCustomOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!fromDate || !toDate}
              onClick={() => {
                setCustomOpen(false);
                goToInspections("custom", fromDate, toDate);
              }}
            >
              View inspections
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
