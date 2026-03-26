import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { PAGES } from "@/endpoints";
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

export type InspectionCounts = {
  inboundPassed: number;
  inboundFailed: number;
  outboundPassed: number;
  outboundFailed: number;
};

export type InspectionCountsScope =
  | { productCategoryId: number; productSerial?: never }
  | { productSerial: string; productCategoryId?: never };

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

function cacheKey(scope: InspectionCountsScope) {
  if ("productCategoryId" in scope) return `category:${scope.productCategoryId}`;
  return `product:${scope.productSerial}`;
}

async function fetchCounts(scope: InspectionCountsScope) {
  const list = await getInspections();
  const filtered = list.filter((i) => {
    if ("productCategoryId" in scope) return i.product_category_id === scope.productCategoryId;
    return i.product_serial === scope.productSerial;
  });

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

  resolvedCountsCache.set(cacheKey(scope), next);
  return next;
}

export function useInspectionCounts(scope: InspectionCountsScope) {
  const key = cacheKey(scope);
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
      fetchCounts(scope).finally(() => {
        pendingCountsCache.delete(key);
      });
    pendingCountsCache.set(key, pending);
    pending.then((next) => {
      if (!cancelled) setCounts(next);
    });

    return () => {
      cancelled = true;
    };
  }, [key, scope]);

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
}: {
  scope: InspectionCountsScope;
  kind: Kind;
}) {
  const { counts, total, loading } = useInspectionCounts(scope);
  if (loading) return <span className="text-muted-foreground text-xs">…</span>;
  if (!counts) return <span className="text-muted-foreground text-xs">-</span>;

  const baseParams =
    "productCategoryId" in scope
      ? { product_category_id: String(scope.productCategoryId) }
      : { product: scope.productSerial };

  if (kind === "total") {
    return (
      <Link to={buildHref(baseParams)} className="inline-block no-underline">
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
        to={buildHref({ ...baseParams, type: "inbound", status: "pass" })}
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
        to={buildHref({ ...baseParams, type: "inbound", status: "fail" })}
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
        to={buildHref({ ...baseParams, type: "outbound", status: "pass" })}
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
      to={buildHref({ ...baseParams, type: "outbound", status: "fail" })}
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

