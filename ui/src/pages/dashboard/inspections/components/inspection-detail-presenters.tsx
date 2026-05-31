import type { ReactNode } from "react";

import { InspectionReviewStatus } from "@/api/generated/model/inspectionReviewStatus";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import { cn } from "@/lib/utils";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import {
  BadgeCheck,
  Bot,
  Gauge,
  Package,
  Tag,
  Truck,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

export function formatInspectionDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return "—";
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function inspectionWasAutoApproved(inspection: Inspection): boolean {
  if (inspection.is_auto_approved === true) return true;
  const comment = (inspection.reviewed_comment ?? "").toLowerCase();
  return (
    comment.includes("auto-approv") ||
    comment.includes("auto approv") ||
    comment.includes("automatically approved")
  );
}

export function inspectionHasDamageRecorded(inspection: Inspection): boolean {
  return [
    inspection.damage_type,
    inspection.damage_severity,
    inspection.damage_cause,
    inspection.damage_grade,
  ].some((v) => Boolean(v?.trim()));
}

function opsReviewStatusLabel(statusRaw?: string): string {
  const s = (statusRaw ?? "").trim().toUpperCase();
  switch (s) {
    case InspectionReviewStatus.IN_REVIEW:
      return "In review";
    case InspectionReviewStatus.PENDING:
      return "Pending";
    case InspectionReviewStatus.APPROVED:
      return "Approved";
    case InspectionReviewStatus.REJECTED:
      return "Rejected";
    default:
      if (!s) return "";
      return s
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

export function InspectionReviewStatusBadge({ status }: { status?: string }) {
  const s = (status ?? "").trim().toUpperCase();
  const label = opsReviewStatusLabel(status);
  const base = "shrink-0 text-[11px] font-medium";
  if (!label) {
    return (
      <Badge variant="outline" className={cn(base, "font-normal text-muted-foreground")}>
        —
      </Badge>
    );
  }
  if (s === InspectionReviewStatus.APPROVED) {
    return (
      <Badge
        variant="outline"
        className={cn(
          base,
          "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
        )}
      >
        {label}
      </Badge>
    );
  }
  if (s === InspectionReviewStatus.REJECTED) {
    return (
      <Badge
        variant="outline"
        className={cn(
          base,
          "border-destructive/45 bg-destructive/10 text-destructive",
        )}
      >
        {label}
      </Badge>
    );
  }
  if (
    s === InspectionReviewStatus.IN_REVIEW ||
    s === InspectionReviewStatus.PENDING
  ) {
    return (
      <Badge
        variant="outline"
        className={cn(
          base,
          "border-amber-500/45 bg-amber-500/10 text-amber-950 dark:text-amber-100",
        )}
      >
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn(base, "font-normal")}>
      {label}
    </Badge>
  );
}

export function InspectionAutoApprovedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 gap-1 border-amber-400/70 bg-amber-100 text-[11px] font-semibold text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-100",
        className,
      )}
    >
      <Bot className="h-3.5 w-3.5" aria-hidden />
      Auto-approved
    </Badge>
  );
}

export function InspectionDetailSection({
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
        "space-y-2 rounded-xl border bg-card/80 p-4 shadow-sm",
        className,
      )}
    >
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function InspectionDetailTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full text-sm">
      <tbody>{children}</tbody>
    </table>
  );
}

export function InspectionDetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <tr className="border-b border-border/50 last:border-0">
      <th
        scope="row"
        className="w-[36%] max-w-[10rem] py-2.5 pr-3 text-left align-top text-[13px] font-normal text-muted-foreground"
      >
        {label}
      </th>
      <td className="py-2.5 text-[13px] font-medium text-foreground">{children}</td>
    </tr>
  );
}

type DamageBadgeDef = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
};

const DAMAGE_BADGES = {
  type: {
    packaging: {
      label: "Packaging",
      icon: Package,
      className:
        "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100",
    },
    cosmetic: {
      label: "Cosmetic",
      icon: Tag,
      className:
        "border-violet-500/30 bg-violet-500/10 text-violet-950 dark:text-violet-100",
    },
    accessories: {
      label: "Accessories",
      icon: BadgeCheck,
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100",
    },
  } satisfies Record<string, DamageBadgeDef>,
  severity: {
    minor: {
      label: "Minor",
      icon: Gauge,
      className:
        "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    },
    major: {
      label: "Major",
      icon: Gauge,
      className:
        "border-rose-500/35 bg-rose-500/10 text-rose-900 dark:text-rose-100",
    },
  } satisfies Record<string, DamageBadgeDef>,
  cause: {
    transit: {
      label: "Transit",
      icon: Truck,
      className:
        "border-indigo-500/30 bg-indigo-500/10 text-indigo-950 dark:text-indigo-100",
    },
    handling: {
      label: "Handling",
      icon: Truck,
      className:
        "border-slate-500/30 bg-slate-500/10 text-slate-950 dark:text-slate-100",
    },
    packaging: {
      label: "Packaging",
      icon: Package,
      className:
        "border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100",
    },
    manufacturing: {
      label: "Manufacturing",
      icon: Tag,
      className:
        "border-teal-500/30 bg-teal-500/10 text-teal-950 dark:text-teal-100",
    },
  } satisfies Record<string, DamageBadgeDef>,
  grade: {
    DGR: {
      label: "DGR",
      icon: BadgeCheck,
      className:
        "border-slate-500/30 bg-slate-500/10 text-slate-950 dark:text-slate-100",
    },
    LDGR: {
      label: "LDGR",
      icon: BadgeCheck,
      className:
        "border-slate-500/30 bg-slate-500/10 text-slate-950 dark:text-slate-100",
    },
    SCRAP: {
      label: "SCRAP",
      icon: XCircle,
      className:
        "border-rose-500/35 bg-rose-500/10 text-rose-900 dark:text-rose-100",
    },
  } satisfies Record<string, DamageBadgeDef>,
} as const;

export function InspectionDamageValueBadge({
  kind,
  value,
}: {
  kind: keyof typeof DAMAGE_BADGES;
  value: string | null | undefined;
}) {
  const v = (value ?? "").trim();
  if (!v || v.toUpperCase() === "NA") {
    return <span className="text-muted-foreground text-sm">NA</span>;
  }

  const defs = DAMAGE_BADGES[kind] as Record<string, DamageBadgeDef>;
  const key = v.toLowerCase();
  const def = defs[key] ?? defs[v] ?? {
    label: v,
    icon: Tag,
    className:
      "border-border/70 bg-muted/20 text-foreground dark:text-foreground",
  };
  const Icon = def.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide",
        def.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {def.label}
    </Badge>
  );
}

export function InspectionLinkedUuid({
  uuid,
  label,
}: {
  uuid: string | null | undefined;
  label: string;
}) {
  const id = uuid?.trim();
  if (!id) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <Link
      to={PAGES.inspectionViewPath(id)}
      className="font-mono text-[12px] text-primary hover:underline"
    >
      {label}: {id.slice(0, 8)}…
    </Link>
  );
}
