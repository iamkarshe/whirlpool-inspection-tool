import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OpsInspectionListCard } from "@/components/ops/ops-inspection-list-card";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { opsListEmptySectionClassName } from "@/components/ops/ops-list-section-classes";
import { PAGES } from "@/endpoints";
import {
  getInspectionsPendingManagerReview,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";

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
              <OpsInspectionListCard
                key={inspection.id}
                inspection={inspection}
                mode="manager-review-queue"
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
