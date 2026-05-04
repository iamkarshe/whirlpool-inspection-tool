import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { OpsInspectionListCard } from "@/components/ops/ops-inspection-list-card";
import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { opsListEmptySectionClassName } from "@/components/ops/ops-list-section-classes";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import { PAGES } from "@/endpoints";
import { OpsKpiPeriodBanner } from "@/components/ops/ops-kpi-stats";
import { filterInspectionsByMetric } from "@/lib/ops-inspection-list-filter";
import {
  opsInspectionListPath,
  opsInspectionListTitle,
  parseOpsInspectionListQuery,
} from "@/lib/ops-inspection-list-query";
import { setPageTitle } from "@/lib/core";
import {
  getInspectionsForOpsList,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function OpsInspectionListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchKey = searchParams.toString();
  const query = useMemo(
    () => parseOpsInspectionListQuery(new URLSearchParams(searchKey)),
    [searchKey],
  );

  const [rows, setRows] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  useEffect(() => {
    if (!query) {
      startTransition(() => {
        setRows([]);
        setLoading(false);
        setError(null);
      });
      return;
    }
    const title = opsInspectionListTitle(query);
    setPageTitle(title);
    let cancelled = false;
    startTransition(() => {
      setLoading(true);
      setError(null);
    });
    const inspectionType =
      query.group === "inbound"
        ? "inbound"
        : query.group === "outbound"
          ? "outbound"
          : null;
    getInspectionsForOpsList({
      date_from: query.from,
      date_to: query.to,
      inspection_type: inspectionType,
    })
      .then((list) => {
        if (cancelled) return;
        setRows(filterInspectionsByMetric(list, query.metric));
      })
      .catch(() => {
        if (!cancelled) setError("Could not load inspections.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (!query) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This link is incomplete.
        </p>
        <Button variant="outline" asChild>
          <Link to={PAGES.OPS_TEAM}>Back to inspections</Link>
        </Button>
      </div>
    );
  }

  const empty = !loading && !error && rows.length === 0;

  const openPeriodDialog = () => {
    setDraftFrom(query.from);
    setDraftTo(query.to);
    setPeriodOpen(true);
  };

  const applyPeriod = () => {
    let from = draftFrom.trim();
    let to = draftTo.trim();
    if (!from || !to) return;
    if (from > to) {
      const t = from;
      from = to;
      to = t;
    }
    setPeriodOpen(false);
    navigate(
      opsInspectionListPath({
        ...query,
        from,
        to,
      }),
    );
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={openPeriodDialog}
        aria-label="Change reporting period"
        className="group w-full rounded-3xl text-left outline-none ring-offset-background transition-transform focus-visible:ring-2 focus-visible:ring-violet-500/45 active:scale-[0.99]"
      >
        <div className="space-y-1">
          <OpsKpiPeriodBanner
            dateFrom={query.from}
            dateTo={query.to}
            className="cursor-pointer transition-colors group-hover:border-violet-500/35 group-hover:bg-violet-500/[0.08] group-hover:ring-violet-500/20"
          />
          <p className="text-center text-[10px] text-muted-foreground">
            Click to change the date range
          </p>
        </div>
      </button>

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reporting period</DialogTitle>
            <DialogDescription>
              Choose dates for this list. Filters (inbound / outbound and
              metric) stay the same.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <label
                className="w-20 text-xs font-medium"
                htmlFor="inspection-list-from"
              >
                From
              </label>
              <input
                id="inspection-list-from"
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="h-9 flex-1 rounded-md border bg-background px-2 text-sm outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label
                className="w-20 text-xs font-medium"
                htmlFor="inspection-list-to"
              >
                To
              </label>
              <input
                id="inspection-list-to"
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="h-9 flex-1 rounded-md border bg-background px-2 text-sm outline-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPeriodOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!draftFrom.trim() || !draftTo.trim()}
              onClick={applyPeriod}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className={opsListEmptySectionClassName(loading, empty)}>
        {loading ? <OpsInspectionSkeleton variant="list" count={5} /> : null}
        {empty ? (
          <OpsListEmptyState
            title="No inspections"
            description="Nothing matched this filter for the selected period."
          />
        ) : null}
        {!loading && !empty
          ? rows.map((inspection) => (
              <OpsInspectionListCard
                key={inspection.id}
                inspection={inspection}
                mode="ops-inspection-list"
                onOpen={() =>
                  navigate(PAGES.opsInspectionDetailPath(inspection.id))
                }
              />
            ))
          : null}
      </section>
    </div>
  );
}
