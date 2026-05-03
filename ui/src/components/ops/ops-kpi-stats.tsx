import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { formatKpiDateRange } from "@/lib/format-kpi-period";
import { cn } from "@/lib/utils";

const KPI_LABEL =
  "font-sans text-[10px] font-bold uppercase leading-tight tracking-wide text-muted-foreground";

const KPI_VALUE =
  "mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground";

export type OpsKpiStatTone = "neutral" | "review" | "approved" | "rejected";

const TONE_CLASS: Record<OpsKpiStatTone, string> = {
  neutral:
    "border-border/60 bg-muted/35 ring-border/35 hover:bg-muted/50 active:bg-muted/55",
  review:
    "border-amber-500/30 bg-amber-500/10 ring-amber-500/20 hover:bg-amber-500/15 active:bg-amber-500/20",
  approved:
    "border-emerald-500/30 bg-emerald-500/10 ring-emerald-500/20 hover:bg-emerald-500/15 active:bg-emerald-500/20",
  rejected:
    "border-rose-500/30 bg-rose-500/10 ring-rose-500/20 hover:bg-rose-500/15 active:bg-rose-500/20",
};

export function OpsKpiPeriodBanner({
  dateFrom,
  dateTo,
  className,
}: {
  dateFrom: string;
  dateTo: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-violet-500/20 bg-violet-500/5 px-4 py-3.5 text-center shadow-sm ring-1 ring-violet-500/10",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-800/90 dark:text-violet-200/90">
        Reporting period
      </p>
      <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
        {formatKpiDateRange(dateFrom, dateTo)}
      </p>
    </div>
  );
}

export function OpsKpiStatCard({
  label,
  value,
  to,
  tone = "neutral",
  className,
}: {
  label: string;
  value: number;
  to: string;
  tone?: OpsKpiStatTone;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-[4.75rem] min-w-0 flex-1 flex-col justify-center rounded-2xl border p-2.5 text-center shadow-sm ring-1 transition-colors",
        TONE_CLASS[tone],
        className,
      )}
    >
      <p className={cn(KPI_LABEL, "line-clamp-2")}>{label}</p>
      <p className={KPI_VALUE}>{value}</p>
    </Link>
  );
}

/** One horizontal band of {@link OpsKpiStatCard}s — same spacing as ops home action grid (`gap-3`). */
export function OpsKpiStatRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex gap-3", className)}>{children}</div>;
}

export function OpsKpiMetricGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border bg-card/80 p-3 shadow-sm ring-1 ring-border/50",
        className,
      )}
    >
      <p className="mb-2.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  );
}
