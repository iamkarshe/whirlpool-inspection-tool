import { PAGES } from "@/endpoints";
import {
  getInspectionQuestionResults,
  getInspections,
  type InspectionQuestionResult,
} from "@/pages/dashboard/inspections/inspection-service";
import { useEffect, useMemo, useState } from "react";
import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ClipboardList,
  XCircle,
} from "lucide-react";

export type ProductCategoryInspectionCounts = {
  inboundPassed: number;
  inboundFailed: number;
  outboundPassed: number;
  outboundFailed: number;
};

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

const resolvedCountsCache = new Map<number, ProductCategoryInspectionCounts>();
const pendingCountsCache = new Map<number, Promise<ProductCategoryInspectionCounts>>();

async function fetchCountsForCategory(categoryId: number) {
  const list = await getInspections();
  const filtered = list.filter((i) => i.product_category_id === categoryId);
  const statuses = await Promise.all(
    filtered.map(async (i) => ({
      inspection: i,
      status: await computeInspectionStatus(i.id),
    })),
  );

  const next: ProductCategoryInspectionCounts = {
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

  resolvedCountsCache.set(categoryId, next);
  return next;
}

export function useProductCategoryInspectionCounts(categoryId: number) {
  const [counts, setCounts] = useState<ProductCategoryInspectionCounts | null>(
    () => resolvedCountsCache.get(categoryId) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    const resolved = resolvedCountsCache.get(categoryId);
    if (resolved) {
      setCounts(resolved);
      return;
    }

    const pending =
      pendingCountsCache.get(categoryId) ??
      fetchCountsForCategory(categoryId).finally(() => {
        pendingCountsCache.delete(categoryId);
      });
    pendingCountsCache.set(categoryId, pending);

    pending.then((next) => {
      if (!cancelled) setCounts(next);
    });

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

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

export function ProductCategoryInspectionCountBadge({
  categoryId,
  kind,
}: {
  categoryId: number;
  kind:
    | "total"
    | "inboundPassed"
    | "inboundFailed"
    | "outboundPassed"
    | "outboundFailed";
}) {
  const { counts, total, loading } = useProductCategoryInspectionCounts(categoryId);

  if (loading) return <span className="text-muted-foreground text-xs">…</span>;
  if (!counts) return <span className="text-muted-foreground text-xs">-</span>;

  if (kind === "total") {
    return (
      <Link
        to={buildHref({ product_category_id: String(categoryId) })}
        className="no-underline"
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
        to={buildHref({
          type: "inbound",
          status: "pass",
          product_category_id: String(categoryId),
        })}
        className="no-underline"
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
        to={buildHref({
          type: "inbound",
          status: "fail",
          product_category_id: String(categoryId),
        })}
        className="no-underline"
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
        to={buildHref({
          type: "outbound",
          status: "pass",
          product_category_id: String(categoryId),
        })}
        className="no-underline"
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
      to={buildHref({
        type: "outbound",
        status: "fail",
        product_category_id: String(categoryId),
      })}
      className="no-underline"
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

