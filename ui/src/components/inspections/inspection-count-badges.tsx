import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import { filterByCalendarDateRange } from "@/lib/date-range-filter";
import {
  getInspectionQuestionResults,
  getInspections,
  type InspectionQuestionResult,
} from "@/pages/dashboard/inspections/inspection-service";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ClipboardList,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { DateRange } from "react-day-picker";

export type InspectionCounts = {
  inboundPassed: number;
  inboundFailed: number;
  outboundPassed: number;
  outboundFailed: number;
};

export type InspectionCountsScope =
  | { productCategoryId: number; productSerial?: never }
  | { productSerial: string; productCategoryId?: never };

export type InspectionCountsOptions = {
  dateRange?: DateRange | undefined;
};

type Kind =
  | "total"
  | "inboundPassed"
  | "inboundFailed"
  | "outboundPassed"
  | "outboundFailed";

function hasAnyFailed(rows: InspectionQuestionResult[]) {
  return rows.some((r) => r.status === "fail");
}

async function computeInspectionStatus(inspectionId: string) {
  const [outer, inner, product] = await Promise.all([
    getInspectionQuestionResults(inspectionId, "outer-packaging"),
    getInspectionQuestionResults(inspectionId, "inner-packaging"),
    getInspectionQuestionResults(inspectionId, "product"),
  ]);
  return [outer, inner, product].some(hasAnyFailed) ? "fail" : "pass";
}

function buildHref(params: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return `${PAGES.DASHBOARD_INSPECTIONS}${search ? `?${search}` : ""}`;
}

const linkBadgeClass = `${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`;

const resolvedCountsCache = new Map<string, InspectionCounts>();
const pendingCountsCache = new Map<string, Promise<InspectionCounts>>();

function cacheKey(scope: InspectionCountsScope, options?: InspectionCountsOptions) {
  const range =
    options?.dateRange?.from
      ? `${options.dateRange.from.toISOString()}..${(
          options.dateRange.to ?? options.dateRange.from
        ).toISOString()}`
      : "";
  if ("productCategoryId" in scope) {
    return `category:${scope.productCategoryId}${range ? `|range:${range}` : ""}`;
  }
  return `product:${scope.productSerial}${range ? `|range:${range}` : ""}`;
}

async function fetchCounts(scope: InspectionCountsScope, options?: InspectionCountsOptions) {
  const list = await getInspections();
  const scoped = list.filter((i) => {
    if ("productCategoryId" in scope) return i.product_category_id === scope.productCategoryId;
    return i.product_serial === scope.productSerial;
  });
  const filtered = options?.dateRange
    ? filterByCalendarDateRange(scoped, (i) => i.created_at, options.dateRange)
    : scoped;

  const statuses = await Promise.all(
    filtered.map(async (i) => ({
      inspection: i,
      status: await computeInspectionStatus(i.id),
    })),
  );

  const next: InspectionCounts = {
    inboundPassed: 0,
    inboundFailed: 0,
    outboundPassed: 0,
    outboundFailed: 0,
  };

  for (const s of statuses) {
    const t = s.inspection.inspection_type;
    if (t === "inbound" && s.status === "pass") next.inboundPassed += 1;
    if (t === "inbound" && s.status === "fail") next.inboundFailed += 1;
    if (t === "outbound" && s.status === "pass") next.outboundPassed += 1;
    if (t === "outbound" && s.status === "fail") next.outboundFailed += 1;
  }

  resolvedCountsCache.set(cacheKey(scope, options), next);
  return next;
}

export function useInspectionCounts(
  scope: InspectionCountsScope,
  options?: InspectionCountsOptions,
) {
  const key = cacheKey(scope, options);
  const [counts, setCounts] = useState<InspectionCounts | null>(
    () => resolvedCountsCache.get(key) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    const resolved = resolvedCountsCache.get(key);
    if (resolved) {
      setCounts(resolved);
      return;
    }

    const pending =
      pendingCountsCache.get(key) ??
      fetchCounts(scope, options).finally(() => {
        pendingCountsCache.delete(key);
      });
    pendingCountsCache.set(key, pending);
    pending.then((next) => {
      if (!cancelled) setCounts(next);
    });

    return () => {
      cancelled = true;
    };
  }, [key, options, scope]);

  const total = useMemo(
    () =>
      !counts
        ? 0
        : counts.inboundPassed +
          counts.inboundFailed +
          counts.outboundPassed +
          counts.outboundFailed,
    [counts],
  );

  return { counts, total, loading: !counts };
}

export function InspectionCountBadge({
  scope,
  kind,
  options,
  linkBasePath,
}: {
  scope: InspectionCountsScope;
  kind: Kind;
  options?: InspectionCountsOptions;
  /**
   * When provided (and scope is category-based), links point to internal
   * Product Category tab pages instead of global Inspections.
   * Example: `/dashboard/masters/product-categories/12`
   */
  linkBasePath?: string;
}) {
  const { counts, total, loading } = useInspectionCounts(scope, options);
  if (loading) return <span className="text-muted-foreground text-xs">…</span>;
  if (!counts) return <span className="text-muted-foreground text-xs">-</span>;

  const internalHref =
    linkBasePath && "productCategoryId" in scope
      ? {
          total: `${linkBasePath}/inspections`,
          inboundPassed: `${linkBasePath}/inspections/inbound`,
          inboundFailed: `${linkBasePath}/inspections/inbound-failed`,
          outboundPassed: `${linkBasePath}/inspections/outbound`,
          outboundFailed: `${linkBasePath}/inspections/outbound-failed`,
        }[kind]
      : null;

  const baseParams =
    "productCategoryId" in scope
      ? { product_category_id: String(scope.productCategoryId) }
      : { product: scope.productSerial };

  if (kind === "total") {
    return (
      <Link
        to={internalHref ?? buildHref(baseParams)}
        className="inline-block no-underline"
      >
        <Badge variant="secondary" className={linkBadgeClass}>
          <ClipboardList />
          {total}
        </Badge>
      </Link>
    );
  }

  if (kind === "inboundPassed") {
    return (
      <Link
        to={
          internalHref ??
          buildHref({ ...baseParams, type: "inbound", status: "pass" })
        }
        className="inline-block no-underline"
      >
        <Badge variant="success" className={linkBadgeClass}>
          <ArrowDownToLine />
          <CheckCircle2 />
          {counts.inboundPassed}
        </Badge>
      </Link>
    );
  }

  if (kind === "inboundFailed") {
    return (
      <Link
        to={
          internalHref ??
          buildHref({ ...baseParams, type: "inbound", status: "fail" })
        }
        className="inline-block no-underline"
      >
        <Badge
          variant="destructive"
          className={`${linkBadgeClass} border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive`}
        >
          <ArrowDownToLine />
          <XCircle />
          {counts.inboundFailed}
        </Badge>
      </Link>
    );
  }

  if (kind === "outboundPassed") {
    return (
      <Link
        to={
          internalHref ??
          buildHref({ ...baseParams, type: "outbound", status: "pass" })
        }
        className="inline-block no-underline"
      >
        <Badge variant="success" className={linkBadgeClass}>
          <ArrowUpFromLine />
          <CheckCircle2 />
          {counts.outboundPassed}
        </Badge>
      </Link>
    );
  }

  return (
    <Link
      to={
        internalHref ??
        buildHref({ ...baseParams, type: "outbound", status: "fail" })
      }
      className="inline-block no-underline"
    >
      <Badge
        variant="destructive"
        className={`${linkBadgeClass} border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive`}
      >
        <ArrowUpFromLine />
        <XCircle />
        {counts.outboundFailed}
      </Badge>
    </Link>
  );
}

