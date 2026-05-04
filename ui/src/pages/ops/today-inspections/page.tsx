import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OpsInspectionListCard } from "@/components/ops/ops-inspection-list-card";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { opsListEmptySectionClassName } from "@/components/ops/ops-list-section-classes";
import { PAGES } from "@/endpoints";
import { cn } from "@/lib/utils";
import {
  getInspectionsForOpsList,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";
import { formatCalendarDateForApi } from "@/services/inspections-api";
import type { InspectionType } from "@/pages/dashboard/inspections/inspection-types";

export default function OpsTodayInspectionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<InspectionType>("inbound");

  useEffect(() => {
    let cancelled = false;
    const day = formatCalendarDateForApi(new Date());
    getInspectionsForOpsList({
      date_from: day,
      date_to: day,
    })
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const inboundCount = useMemo(
    () => rows.filter((r) => r.inspection_type === "inbound").length,
    [rows],
  );
  const outboundCount = useMemo(
    () => rows.filter((r) => r.inspection_type === "outbound").length,
    [rows],
  );

  const filteredRows = useMemo(
    () => rows.filter((r) => r.inspection_type === direction),
    [rows, direction],
  );

  const empty = !loading && filteredRows.length === 0;
  const emptyAllTypes = !loading && rows.length === 0;

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
              ({inboundCount})
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
              ({outboundCount})
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
        {filteredRows.map((inspection) => (
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
    </div>
  );
}
