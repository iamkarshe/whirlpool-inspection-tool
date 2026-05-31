import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OpsInspectionListCard } from "@/components/ops/ops-inspection-list-card";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { opsListEmptySectionClassName } from "@/components/ops/ops-list-section-classes";
import { OpsLoadMoreButton } from "@/components/ops/ops-load-more-button";
import { PAGES } from "@/endpoints";
import { useOpsInspectionsPagedList } from "@/hooks/use-ops-inspections-paged-list";
import { cn } from "@/lib/utils";
import type { InspectionType } from "@/pages/dashboard/inspections/inspection-types";
import { formatCalendarDateForApi, fetchInspectionsPage } from "@/services/inspections-api";

export default function OpsTodayInspectionsPage() {
  const navigate = useNavigate();
  const [direction, setDirection] = useState<InspectionType>("inbound");
  const day = formatCalendarDateForApi(new Date());
  const [inboundCount, setInboundCount] = useState<number | null>(null);
  const [outboundCount, setOutboundCount] = useState<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    const base = {
      date_field: "created_at" as const,
      date_from: day,
      date_to: day,
      page: 1,
      per_page: 1,
      sort_by: "created_at",
      sort_dir: "desc" as const,
    };
    Promise.all([
      fetchInspectionsPage(
        { ...base, inspection_type: "inbound" },
        { signal: ac.signal },
      ),
      fetchInspectionsPage(
        { ...base, inspection_type: "outbound" },
        { signal: ac.signal },
      ),
    ])
      .then(([inbound, outbound]) => {
        if (cancelled) return;
        setInboundCount(inbound.total);
        setOutboundCount(outbound.total);
      })
      .catch(() => {
        if (!cancelled) {
          setInboundCount(null);
          setOutboundCount(null);
        }
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [day]);

  const { rows, loading, loadingMore, hasMore, loadMore } = useOpsInspectionsPagedList({
    query: {
      date_from: day,
      date_to: day,
      inspection_type: direction,
    },
  });

  const empty = !loading && rows.length === 0;
  const emptyAllTypes =
    !loading &&
    rows.length === 0 &&
    inboundCount === 0 &&
    outboundCount === 0;

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/60 p-1"
        role="tablist"
        aria-label="Inspection direction"
      >
        <button
          type="button"
          role="tab"
          aria-selected={direction === "inbound"}
          onClick={() => setDirection("inbound")}
          className={cn(
            "rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all",
            direction === "inbound"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/60 dark:bg-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <ArrowDownToLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Inbound
            <span className="tabular-nums text-[11px] font-medium text-muted-foreground">
              ({inboundCount ?? "…"})
            </span>
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={direction === "outbound"}
          onClick={() => setDirection("outbound")}
          className={cn(
            "rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition-all",
            direction === "outbound"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/60 dark:bg-card"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Outbound
            <span className="tabular-nums text-[11px] font-medium text-muted-foreground">
              ({outboundCount ?? "…"})
            </span>
          </span>
        </button>
      </div>

      <section className={opsListEmptySectionClassName(loading, empty)}>
        {loading ? <OpsInspectionSkeleton variant="list" count={4} /> : null}
        {empty ? (
          <OpsListEmptyState
            title={
              emptyAllTypes
                ? "No inspections yet"
                : direction === "inbound"
                  ? "No inbound inspections"
                  : "No outbound inspections"
            }
            description={
              emptyAllTypes
                ? "Completed checks will appear here so you can open details in one tap."
                : "Nothing logged for this direction yet. Try the other tab or check back later."
            }
          />
        ) : null}
        {rows.map((inspection) => (
          <OpsInspectionListCard
            key={inspection.id}
            inspection={inspection}
            mode="today"
            onOpen={() =>
              navigate(PAGES.opsInspectionDetailPath(inspection.id))
            }
          />
        ))}
      </section>

      <OpsLoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        onClick={loadMore}
      />
    </div>
  );
}
