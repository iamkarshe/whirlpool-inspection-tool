import { ChevronRight, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { opsListEmptySectionClassName } from "@/components/ops/ops-list-section-classes";
import { OpsListHint } from "@/components/ops/ops-list-hint";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import {
  getInspectionsPendingManagerReview,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";
import { InspectionTypeBadge } from "@/pages/dashboard/inspections/inspection-badge";

function toTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OpsTeamReviewPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInspectionsPendingManagerReview()
      .then((list) => {
        if (!cancelled) {
          setError(null);
          setRows(list);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load Inspection Review.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const empty = !loading && !error && rows.length === 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        All inspections currently pending for your review.
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className={opsListEmptySectionClassName(loading, empty)}>
        {loading ? <OpsInspectionSkeleton variant="list" count={4} /> : null}
        {empty ? (
          <OpsListEmptyState
            title="Queue is clear"
            description="Nothing needs your review right now. New submissions will appear here."
          />
        ) : null}
        {!loading && !empty
          ? rows.map((inspection) => (
              <button
                key={inspection.id}
                type="button"
                onClick={() =>
                  navigate(PAGES.opsInspectionDetailPath(inspection.id))
                }
                className="flex w-full items-center justify-between gap-3 rounded-3xl border bg-card/80 p-3 text-left shadow-sm transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <InspectionTypeBadge
                        inspectionType={inspection.inspection_type}
                      />
                      <Badge variant="outline" className="text-[10px]">
                        Needs review
                      </Badge>
                    </div>
                    <p className="truncate text-sm font-semibold font-mono">
                      {inspection.product_serial}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {inspection.inspector_name} ·{" "}
                      {toTime(inspection.created_at)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))
          : null}
      </section>
    </div>
  );
}
