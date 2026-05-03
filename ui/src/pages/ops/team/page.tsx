import { ClipboardCheck, ListChecks } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import type { GetInspectionKpisManagerApiInspectionsKpisManagerGetParams } from "@/api/generated/model/getInspectionKpisManagerApiInspectionsKpisManagerGetParams";
import { GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod } from "@/api/generated/model/getInspectionKpisManagerApiInspectionsKpisManagerGetPeriod";
import type { ManagerInspectionTeamKpisResponse } from "@/api/generated/model/managerInspectionTeamKpisResponse";
import {
  OpsKpiMetricGroup,
  OpsKpiPeriodBanner,
  OpsKpiStatCard,
  OpsKpiStatRow,
} from "@/components/ops/ops-kpi-stats";
import { OpsTeamKpiSkeleton } from "@/components/ops/ops-team-kpi-skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PAGES } from "@/endpoints";
import { opsInspectionListPath } from "@/lib/ops-inspection-list-query";
import { cn } from "@/lib/utils";
import {
  fetchManagerTeamInspectionKpis,
  opsInspectionApiError,
} from "@/services/ops-inspections-api";

const PRESETS: {
  period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod;
  label: string;
  hint: string;
}[] = [
  {
    period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.today,
    label: "Today",
    hint: "Current calendar day (UTC window)",
  },
  {
    period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.yesterday,
    label: "Yesterday",
    hint: "Previous calendar day",
  },
  {
    period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.week,
    label: "This week",
    hint: "Monday through today",
  },
  {
    period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.month,
    label: "This month",
    hint: "1st of month through today",
  },
];

function queriesEqual(
  a: GetInspectionKpisManagerApiInspectionsKpisManagerGetParams,
  b: GetInspectionKpisManagerApiInspectionsKpisManagerGetParams,
): boolean {
  return (
    (a.period ?? null) === (b.period ?? null) &&
    (a.date_from ?? null) === (b.date_from ?? null) &&
    (a.date_to ?? null) === (b.date_to ?? null)
  );
}

export default function OpsTeamPage() {
  const [query, setQuery] =
    useState<GetInspectionKpisManagerApiInspectionsKpisManagerGetParams>({
      period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.today,
    });
  const [kpis, setKpis] = useState<ManagerInspectionTeamKpisResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const isFirstLoad = useRef(true);

  const load = useCallback(
    async (
      params: GetInspectionKpisManagerApiInspectionsKpisManagerGetParams,
      signal: AbortSignal,
    ) => {
      if (isFirstLoad.current) setLoading(true);
      else setRefetching(true);
      setError(null);
      try {
        const data = await fetchManagerTeamInspectionKpis(params, { signal });
        if (signal.aborted) return;
        setKpis(data);
        isFirstLoad.current = false;
      } catch (e: unknown) {
        if (signal.aborted) return;
        setError(
          opsInspectionApiError(e, "Could not load team KPIs. Try again."),
        );
      } finally {
        if (!signal.aborted) {
          setLoading(false);
          setRefetching(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const ac = new AbortController();
    void load(query, ac.signal);
    return () => ac.abort();
  }, [query, load]);

  const periodFrom = kpis?.date_from?.trim();
  const periodTo = kpis?.date_to?.trim();

  const listHref = useMemo(() => {
    if (!periodFrom || !periodTo) return null;
    const q = { from: periodFrom, to: periodTo } as const;
    return {
      all: (metric: "total" | "in_review" | "approved" | "rejected") =>
        opsInspectionListPath({ ...q, group: "all", metric }),
      inbound: (metric: "in_review" | "approved" | "rejected") =>
        opsInspectionListPath({ ...q, group: "inbound", metric }),
      outbound: (metric: "in_review" | "approved" | "rejected") =>
        opsInspectionListPath({ ...q, group: "outbound", metric }),
    };
  }, [periodFrom, periodTo]);

  const all = kpis?.all_inspections;

  const openPeriodDialog = () => {
    if (
      query.period ===
        GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.custom &&
      query.date_from &&
      query.date_to
    ) {
      setCustomFrom(query.date_from);
      setCustomTo(query.date_to);
    } else if (periodFrom && periodTo) {
      setCustomFrom(periodFrom.slice(0, 10));
      setCustomTo(periodTo.slice(0, 10));
    } else {
      setCustomFrom("");
      setCustomTo("");
    }
    setPeriodDialogOpen(true);
  };

  const applyPreset = (
    period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod,
  ) => {
    setQuery({ period });
    setPeriodDialogOpen(false);
  };

  const applyCustomRange = () => {
    const from = customFrom.trim();
    const to = customTo.trim();
    if (!from || !to) return;
    if (from > to) {
      setError("Custom range: “From” must be on or before “To”.");
      return;
    }
    setError(null);
    setQuery({
      period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.custom,
      date_from: from,
      date_to: to,
    });
    setPeriodDialogOpen(false);
  };

  const isPresetSelected = (
    period: GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod,
  ) => {
    if (period === GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.custom) {
      return (
        query.period ===
        GetInspectionKpisManagerApiInspectionsKpisManagerGetPeriod.custom
      );
    }
    return queriesEqual(query, { period });
  };

  return (
    <div className="space-y-4 pb-2">
      {loading && !kpis ? <OpsTeamKpiSkeleton /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {kpis && periodFrom && periodTo ? (
        <OpsKpiPeriodBanner
          dateFrom={periodFrom}
          dateTo={periodTo}
          onChangePeriodClick={openPeriodDialog}
          isUpdating={refetching}
        />
      ) : null}

      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reporting period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(({ period, label, hint }) => (
                <button
                  key={period}
                  type="button"
                  title={hint}
                  onClick={() => applyPreset(period)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left text-sm font-semibold shadow-sm transition-colors",
                    isPresetSelected(period) ?
                      "border-violet-500/50 bg-violet-500/15 text-violet-950 dark:text-violet-50"
                    : "border-border/70 bg-muted/30 hover:bg-muted/50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-2 rounded-2xl border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Custom range (UTC dates)
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="team-kpi-from" className="text-xs">
                    From
                  </Label>
                  <input
                    id="team-kpi-from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="team-kpi-to" className="text-xs">
                    To
                  </Label>
                  <input
                    id="team-kpi-to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPeriodDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!customFrom.trim() || !customTo.trim()}
              onClick={() => applyCustomRange()}
            >
              Apply custom range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {kpis && !loading && all && listHref ? (
        <div
          className={cn(
            "space-y-3 transition-opacity",
            refetching && "pointer-events-none opacity-60",
          )}
        >
          <OpsKpiMetricGroup title="All inspections">
            <OpsKpiStatRow>
              <OpsKpiStatCard
                label="Total"
                value={all.total}
                to={listHref.all("total")}
                tone="neutral"
              />
              <OpsKpiStatCard
                label="In review"
                value={all.in_review}
                to={listHref.all("in_review")}
                tone="review"
              />
              <OpsKpiStatCard
                label="Approved"
                value={all.approved}
                to={listHref.all("approved")}
                tone="approved"
              />
              <OpsKpiStatCard
                label="Rejected"
                value={all.rejected}
                to={listHref.all("rejected")}
                tone="rejected"
              />
            </OpsKpiStatRow>
          </OpsKpiMetricGroup>

          <OpsKpiMetricGroup title="Inbound">
            <OpsKpiStatRow>
              <OpsKpiStatCard
                label="In review"
                value={kpis.inbound.in_review}
                to={listHref.inbound("in_review")}
                tone="review"
              />
              <OpsKpiStatCard
                label="Approved"
                value={kpis.inbound.approved}
                to={listHref.inbound("approved")}
                tone="approved"
              />
              <OpsKpiStatCard
                label="Rejected"
                value={kpis.inbound.rejected}
                to={listHref.inbound("rejected")}
                tone="rejected"
              />
            </OpsKpiStatRow>
          </OpsKpiMetricGroup>

          <OpsKpiMetricGroup title="Outbound">
            <OpsKpiStatRow>
              <OpsKpiStatCard
                label="In review"
                value={kpis.outbound.in_review}
                to={listHref.outbound("in_review")}
                tone="review"
              />
              <OpsKpiStatCard
                label="Approved"
                value={kpis.outbound.approved}
                to={listHref.outbound("approved")}
                tone="approved"
              />
              <OpsKpiStatCard
                label="Rejected"
                value={kpis.outbound.rejected}
                to={listHref.outbound("rejected")}
                tone="rejected"
              />
            </OpsKpiStatRow>
          </OpsKpiMetricGroup>
        </div>
      ) : null}

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 text-center shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="text-sm font-semibold">Inspection Review</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Open the queue, tap an inspection, then approve or reject after
          checking checklist results and photos.
        </p>
        <Button asChild>
          <Link
            to={PAGES.OPS_TEAM_REVIEW}
            className="inline-flex w-full items-center justify-center gap-2"
          >
            <ListChecks className="h-4 w-4 shrink-0" />
            Open review queue
          </Link>
        </Button>
      </section>
    </div>
  );
}
