import { ClipboardCheck, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import {
  getInspectionKpis,
  type InspectionKpis,
} from "@/pages/dashboard/inspections/inspection-service";

function KpiTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "amber" | "emerald" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
      : tone === "emerald"
        ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
        : tone === "rose"
          ? "bg-rose-500/10 text-rose-800 dark:text-rose-200"
          : "bg-muted/50 text-foreground";
  return (
    <div className={`rounded-2xl border p-3 text-center shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function OpsTeamPage() {
  const [kpis, setKpis] = useState<InspectionKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInspectionKpis()
      .then((data) => {
        if (!cancelled) setKpis(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load KPIs. Pull to retry from home.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4 pb-2">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Manager
        </p>
        <h1 className="text-xl font-semibold tracking-tight">Team overview</h1>
        <p className="text-sm text-muted-foreground">
          KPIs for your operators and shortcuts to quality review.
        </p>
      </header>

      {kpis?.periodFrom && kpis?.periodTo ? (
        <p className="text-[11px] text-muted-foreground">
          Period: {formatDate(kpis.periodFrom)} — {formatDate(kpis.periodTo)}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading KPIs…</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {kpis && !loading ? (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <KpiTile label="Total inspections" value={kpis.totalInspections} tone="neutral" />
            <KpiTile
              label="Inbound in review"
              value={kpis.inboundInReview}
              tone="amber"
            />
            <KpiTile
              label="Outbound in review"
              value={kpis.outboundInReview}
              tone="amber"
            />
            <KpiTile label="Inbound approved" value={kpis.inboundApproved} tone="emerald" />
            <KpiTile label="Inbound rejected" value={kpis.inboundRejected} tone="rose" />
            <KpiTile label="Outbound approved" value={kpis.outboundApproved} tone="emerald" />
            <KpiTile label="Outbound rejected" value={kpis.outboundRejected} tone="rose" />
          </div>
        </section>
      ) : null}

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">Inspection review</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Open the queue, tap an inspection, then approve or reject after checking
          checklist results and photos.
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
