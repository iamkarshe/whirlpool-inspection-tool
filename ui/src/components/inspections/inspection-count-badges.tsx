import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ClipboardList,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Link } from "react-router-dom";

import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
import { filterByCalendarDateRange } from "@/lib/date-range-filter";
import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import { fetchInspectionsPage } from "@/services/inspections-api";

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

function buildHref(params: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return `${PAGES.DASHBOARD_INSPECTIONS}${search ? `?${search}` : ""}`;
}

const linkBadgeClass = `${BADGE_ICON_CLASS} cursor-pointer transition-colors hover:bg-primary/15 hover:text-primary`;

function cacheKey(
  scope: InspectionCountsScope,
  options?: InspectionCountsOptions,
) {
  const range = options?.dateRange?.from
    ? `${options.dateRange.from.toISOString()}..${(
        options.dateRange.to ?? options.dateRange.from
      ).toISOString()}`
    : "";
  if ("productCategoryId" in scope) {
    return `category:${scope.productCategoryId}${range ? `|range:${range}` : ""}`;
  }
  return `product:${scope.productSerial}${range ? `|range:${range}` : ""}`;
}

function countsFromInspections(list: Inspection[]): InspectionCounts {
  const next: InspectionCounts = {
    inboundPassed: 0,
    inboundFailed: 0,
    outboundPassed: 0,
    outboundFailed: 0,
  };
  for (const i of list) {
    const quality = i.checklist_quality ?? "pass";
    if (i.inspection_type === "inbound" && quality === "pass") next.inboundPassed += 1;
    if (i.inspection_type === "inbound" && quality === "fail") next.inboundFailed += 1;
    if (i.inspection_type === "outbound" && quality === "pass") next.outboundPassed += 1;
    if (i.inspection_type === "outbound" && quality === "fail") next.outboundFailed += 1;
  }
  return next;
}

async function fetchCountsForScope(
  scope: InspectionCountsScope,
  options?: InspectionCountsOptions,
  opts?: { signal?: AbortSignal },
): Promise<InspectionCounts> {
  const search =
    "productSerial" in scope
      ? (scope.productSerial ?? "").trim()
      : String(scope.productCategoryId);

  const { data } = await fetchInspectionsPage(
    {
      page: 1,
      per_page: 100,
      search: search.length > 0 ? search : null,
      sort_by: "created_at",
      sort_dir: "desc",
    },
    opts,
  );

  let scoped = data.filter((i) => {
    if ("productCategoryId" in scope) {
      return i.product_category_id === scope.productCategoryId;
    }
    return i.product_serial === scope.productSerial;
  });

  if (options?.dateRange) {
    scoped = filterByCalendarDateRange(
      scoped,
      (i) => i.created_at,
      options.dateRange,
    );
  }

  return countsFromInspections(scoped);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useInspectionCounts(
  scope: InspectionCountsScope,
  options?: InspectionCountsOptions,
) {
  const key = cacheKey(scope, options);
  const [counts, setCounts] = useState<InspectionCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    setLoading(true);
    fetchCountsForScope(scope, options, { signal: ac.signal })
      .then((next) => {
        if (!cancelled) setCounts(next);
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      ac.abort();
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

  return { counts, total, loading };
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

  const baseParams: Record<string, string> = {};
  if ("productCategoryId" in scope) {
    baseParams.product_category_id = String(scope.productCategoryId);
  } else {
    baseParams.product = scope.productSerial;
  }

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
