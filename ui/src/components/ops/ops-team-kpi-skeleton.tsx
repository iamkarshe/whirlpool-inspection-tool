import { Skeleton } from "@/components/ui/skeleton";

function KpiStatCardSkeleton() {
  return (
    <div
      className="flex min-h-[4.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-muted/25 p-2.5 shadow-sm ring-1 ring-border/35"
      aria-hidden
    >
      <Skeleton className="h-2.5 w-14 rounded-full" />
      <Skeleton className="h-6 w-9 rounded-md" />
    </div>
  );
}

/** Placeholder layout matching the ops team KPI period banner and metric groups. */
export function OpsTeamKpiSkeleton() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading inspection KPIs"
    >
      <div className="rounded-3xl border border-border/50 bg-muted/15 px-4 py-3.5 text-center shadow-sm ring-1 ring-border/40">
        <div className="mx-auto flex max-w-[220px] flex-col items-center gap-2">
          <Skeleton className="h-2.5 w-32 rounded-full" />
          <Skeleton className="h-4 w-full max-w-[180px] rounded-md" />
        </div>
      </div>

      <div className="space-y-3">
        <section className="rounded-3xl border bg-card/80 p-3 shadow-sm ring-1 ring-border/50">
          <Skeleton className="mb-2.5 h-3 w-28 rounded-full" />
          <div className="flex gap-3">
            <KpiStatCardSkeleton />
            <KpiStatCardSkeleton />
            <KpiStatCardSkeleton />
            <KpiStatCardSkeleton />
          </div>
        </section>
        <section className="rounded-3xl border bg-card/80 p-3 shadow-sm ring-1 ring-border/50">
          <Skeleton className="mb-2.5 h-3 w-20 rounded-full" />
          <div className="flex gap-3">
            <KpiStatCardSkeleton />
            <KpiStatCardSkeleton />
            <KpiStatCardSkeleton />
          </div>
        </section>
        <section className="rounded-3xl border bg-card/80 p-3 shadow-sm ring-1 ring-border/50">
          <Skeleton className="mb-2.5 h-3 w-24 rounded-full" />
          <div className="flex gap-3">
            <KpiStatCardSkeleton />
            <KpiStatCardSkeleton />
            <KpiStatCardSkeleton />
          </div>
        </section>
      </div>
    </div>
  );
}
