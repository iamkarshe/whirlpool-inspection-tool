import { ClipboardCheck, ListChecks } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  OpsKpiMetricGroup,
  OpsKpiPeriodBanner,
  OpsKpiStatCard,
  OpsKpiStatRow,
} from "@/components/ops/ops-kpi-stats";
import { OpsTeamKpiSkeleton } from "@/components/ops/ops-team-kpi-skeleton";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { opsInspectionListPath } from "@/lib/ops-inspection-list-query";
import {
  getInspectionKpis,
  type InspectionKpis,
} from "@/pages/dashboard/inspections/inspection-service";

function aggregateFromLanes(k: InspectionKpis) {
  return {
    inReview: k.inboundInReview + k.outboundInReview,
    approved: k.inboundApproved + k.outboundApproved,
    rejected: k.inboundRejected + k.outboundRejected,
  };
}

export default function OpsTeamPage() {
  const [kpis, setKpis] = useState<InspectionKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInspectionKpis()
      .then((data) => {
        if (!cancelled) setKpis(data);
      })
      .catch(() => {
        if (!cancelled)
          setError("Could not load KPIs. Pull to retry from home.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allRow = useMemo(() => {
    if (!kpis) return null;
    const a = kpis.analytics;
    if (a) {
      return {
        total: a.scansTotal,
        inReview: a.scansInReview,
        approved: a.scansApproved,
        rejected: a.scansRejected,
      };
    }
    const lanes = aggregateFromLanes(kpis);
    return {
      total: kpis.totalInspections,
      inReview: lanes.inReview,
      approved: lanes.approved,
      rejected: lanes.rejected,
    };
  }, [kpis]);

  const periodFrom = kpis?.periodFrom?.trim();
  const periodTo = kpis?.periodTo?.trim();

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

  return (
    <div className="space-y-4 pb-2">
      {loading ? <OpsTeamKpiSkeleton /> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {kpis && !loading && periodFrom && periodTo ? (
        <OpsKpiPeriodBanner dateFrom={periodFrom} dateTo={periodTo} />
      ) : null}

      {kpis && !loading && allRow && listHref ? (
        <div className="space-y-3">
          <OpsKpiMetricGroup title="All inspections">
            <OpsKpiStatRow>
              <OpsKpiStatCard
                label="Total"
                value={allRow.total}
                to={listHref.all("total")}
                tone="neutral"
              />
              <OpsKpiStatCard
                label="In review"
                value={allRow.inReview}
                to={listHref.all("in_review")}
                tone="review"
              />
              <OpsKpiStatCard
                label="Approved"
                value={allRow.approved}
                to={listHref.all("approved")}
                tone="approved"
              />
              <OpsKpiStatCard
                label="Rejected"
                value={allRow.rejected}
                to={listHref.all("rejected")}
                tone="rejected"
              />
            </OpsKpiStatRow>
          </OpsKpiMetricGroup>

          <OpsKpiMetricGroup title="Inbound">
            <OpsKpiStatRow>
              <OpsKpiStatCard
                label="In review"
                value={kpis.inboundInReview}
                to={listHref.inbound("in_review")}
                tone="review"
              />
              <OpsKpiStatCard
                label="Approved"
                value={kpis.inboundApproved}
                to={listHref.inbound("approved")}
                tone="approved"
              />
              <OpsKpiStatCard
                label="Rejected"
                value={kpis.inboundRejected}
                to={listHref.inbound("rejected")}
                tone="rejected"
              />
            </OpsKpiStatRow>
          </OpsKpiMetricGroup>

          <OpsKpiMetricGroup title="Outbound">
            <OpsKpiStatRow>
              <OpsKpiStatCard
                label="In review"
                value={kpis.outboundInReview}
                to={listHref.outbound("in_review")}
                tone="review"
              />
              <OpsKpiStatCard
                label="Approved"
                value={kpis.outboundApproved}
                to={listHref.outbound("approved")}
                tone="approved"
              />
              <OpsKpiStatCard
                label="Rejected"
                value={kpis.outboundRejected}
                to={listHref.outbound("rejected")}
                tone="rejected"
              />
            </OpsKpiStatRow>
          </OpsKpiMetricGroup>
        </div>
      ) : null}

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Inspection review</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Open the queue, tap an inspection, then approve or reject after
          checking checklist results and photos.
        </p>
        <Button className="w-full" asChild>
          <Link to={PAGES.OPS_TEAM_REVIEW}>
            <ListChecks className="mr-2 h-4 w-4" />
            Open review queue
          </Link>
        </Button>
      </section>
    </div>
  );
}
