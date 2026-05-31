import { useNavigate } from "react-router-dom";

import { OpsInspectionListCard } from "@/components/ops/ops-inspection-list-card";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { opsListEmptySectionClassName } from "@/components/ops/ops-list-section-classes";
import { OpsLoadMoreButton } from "@/components/ops/ops-load-more-button";
import { PAGES } from "@/endpoints";
import { useOpsInspectionsPagedList } from "@/hooks/use-ops-inspections-paged-list";
import { inspectionIsPendingManagerReview } from "@/pages/dashboard/inspections/inspection-service";

export default function OpsTeamReviewPage() {
  const navigate = useNavigate();
  const { rows, loading, loadingMore, error, hasMore, loadMore } =
    useOpsInspectionsPagedList({
      query: {},
      refinePage: (page) => page.filter(inspectionIsPendingManagerReview),
    });

  const empty = !loading && !error && rows.length === 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Inspections pending manager review (loaded in pages — use Load more for
        older items).
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

      <OpsLoadMoreButton
        hasMore={hasMore}
        loading={loadingMore}
        onClick={loadMore}
      />
    </div>
  );
}
