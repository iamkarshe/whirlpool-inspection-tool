import { useCallback, useEffect, useRef, useState } from "react";

import type { Inspection } from "@/pages/dashboard/inspections/inspection-types";
import { fetchInspectionsPage } from "@/services/inspections-api";

const OPS_LIST_PAGE_SIZE = 20;

export type OpsInspectionsPagedQuery = {
  date_from?: string | null;
  date_to?: string | null;
  inspection_type?: "inbound" | "outbound" | null;
};

export type UseOpsInspectionsPagedListOptions = {
  query: OpsInspectionsPagedQuery | null;
  /** Applied to each fetched page before appending (e.g. review lane). */
  refinePage?: (rows: Inspection[]) => Inspection[];
  pageSize?: number;
};

export function useOpsInspectionsPagedList({
  query,
  refinePage,
  pageSize = OPS_LIST_PAGE_SIZE,
}: UseOpsInspectionsPagedListOptions) {
  const [rows, setRows] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const refineRef = useRef(refinePage);
  refineRef.current = refinePage;

  const queryKey = query
    ? `${query.date_from ?? ""}|${query.date_to ?? ""}|${query.inspection_type ?? ""}`
    : "";

  const loadPage = useCallback(
    async (pageIndex: number, append: boolean, signal?: AbortSignal) => {
      if (!query) {
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      if (pageIndex === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const hasDates = Boolean(query.date_from && query.date_to);
        const { data, total: t } = await fetchInspectionsPage(
          {
            page: pageIndex + 1,
            per_page: pageSize,
            sort_by: "created_at",
            sort_dir: "desc",
            date_field: hasDates ? "created_at" : null,
            date_from: hasDates ? query.date_from : null,
            date_to: hasDates ? query.date_to : null,
            inspection_type: query.inspection_type ?? null,
          },
          { signal },
        );
        const refined = refineRef.current ? refineRef.current(data) : data;
        setTotal(t);
        setRows((prev) => (append ? [...prev, ...refined] : refined));
        setPage(pageIndex);
      } catch {
        if (!signal?.aborted) {
          setError("Could not load inspections.");
          if (!append) setRows([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, pageSize],
  );

  useEffect(() => {
    if (!query) {
      setRows([]);
      setLoading(false);
      setPage(0);
      setTotal(0);
      return;
    }
    const ac = new AbortController();
    void loadPage(0, false, ac.signal);
    return () => ac.abort();
  }, [queryKey, loadPage, query]);

  const loadedCount = (page + 1) * pageSize;
  const hasMore = rows.length < total && loadedCount < total;

  const loadMore = useCallback(() => {
    if (!query || loading || loadingMore || !hasMore) return;
    void loadPage(page + 1, true);
  }, [query, loading, loadingMore, hasMore, loadPage, page]);

  return {
    rows,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    total,
  };
}
