import type { ReactNode } from "react";

import { InspectionReviewStatus } from "@/api/generated/model/inspectionReviewStatus";
import { Badge } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import { cn } from "@/lib/utils";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import {
  BadgeCheck,
  Bot,
  ClipboardCheck,
  Gauge,
  MapPin,
  Package,
  Tag,
  Truck,
  XCircle,
  type LucideIcon,
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

/** Human reviewer name, or a fixed label when the auto-approve job signed off. */
export function formatInspectionReviewerLabel(inspection: Inspection): string {
  if (inspectionWasAutoApproved(inspection)) return "System Auto Approved";
  return inspection.reviewer_name?.trim() || "—";
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

export type InspectionDetailSectionTone =
  | "product"
  | "location"
  | "shipment"
  | "review";

const SECTION_META: Record<
  InspectionDetailSectionTone,
  {
    icon: LucideIcon;
    border: string;
    surface: string;
    header: string;
    iconWrap: string;
    accent: string;
  }
> = {
  product: {
    icon: Package,
    border: "border-sky-200/80 dark:border-sky-800/60",
    surface:
      "bg-gradient-to-b from-sky-50/90 to-sky-50/30 dark:from-sky-950/35 dark:to-sky-950/10",
    header: "border-sky-200/50 bg-sky-100/50 dark:border-sky-800/40 dark:bg-sky-900/25",
    iconWrap: "bg-sky-500/15 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
    accent: "bg-sky-500",
  },
  location: {
    icon: MapPin,
    border: "border-emerald-200/80 dark:border-emerald-800/60",
    surface:
      "bg-gradient-to-b from-emerald-50/90 to-emerald-50/25 dark:from-emerald-950/35 dark:to-emerald-950/10",
    header:
      "border-emerald-200/50 bg-emerald-100/45 dark:border-emerald-800/40 dark:bg-emerald-900/25",
    iconWrap:
      "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
    accent: "bg-emerald-500",
  },
  shipment: {
    icon: Truck,
    border: "border-amber-200/80 dark:border-amber-800/55",
    surface:
      "bg-gradient-to-b from-amber-50/85 to-amber-50/20 dark:from-amber-950/30 dark:to-amber-950/10",
    header:
      "border-amber-200/50 bg-amber-100/45 dark:border-amber-800/40 dark:bg-amber-900/25",
    iconWrap:
      "bg-amber-500/15 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
    accent: "bg-amber-500",
  },
  review: {
    icon: ClipboardCheck,
    border: "border-violet-200/80 dark:border-violet-800/55",
    surface:
      "bg-gradient-to-b from-violet-50/85 to-violet-50/20 dark:from-violet-950/30 dark:to-violet-950/10",
    header:
      "border-violet-200/50 bg-violet-100/45 dark:border-violet-800/40 dark:bg-violet-900/25",
    iconWrap:
      "bg-violet-500/15 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100",
    accent: "bg-violet-500",
  },
};

export function InspectionDetailSection({
  title,
  description,
  children,
  className,
  tone = "product",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  tone?: InspectionDetailSectionTone;
}) {
  const meta = SECTION_META[tone];
  const Icon = meta.icon;

  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border shadow-sm",
        meta.border,
        meta.surface,
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-start gap-2.5 border-b px-3 py-2.5",
          meta.header,
        )}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-0.5",
            meta.accent,
            "opacity-80",
          )}
          aria-hidden
        />
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            meta.iconWrap,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-xs font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-[10px] leading-snug">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">{children}</div>
    </section>
  );
}

export function InspectionDetailField({
  label,
  children,
  mono,
  className,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-background/55 px-2.5 py-2 ring-1 ring-inset ring-border/40",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "mt-1 text-[12px] font-medium leading-snug text-foreground",
          mono && "font-mono text-[11px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** @deprecated Prefer {@link InspectionDetailField} in card grids. */
export function InspectionDetailTable({ children }: { children: ReactNode }) {
  return (
    <table className="w-full text-[12px] leading-snug">
      <tbody>{children}</tbody>
    </table>
  );
}

/** @deprecated Prefer {@link InspectionDetailField} in card grids. */
export function InspectionDetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <th
        scope="row"
        className="w-[38%] max-w-[9rem] py-1 pr-2 text-left align-top text-[11px] font-normal text-muted-foreground"
      >
        {label}
      </th>
      <td className="py-1 text-[12px] font-medium text-foreground">{children}</td>
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
