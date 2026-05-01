import type { DataTableServerSideConfig } from "@/components/ui/data-table";
import {
  DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  DEFAULT_SERVER_DATA_TABLE_SEARCH_DEBOUNCE_MS,
} from "@/components/ui/data-table-server";
import {
  useServerTableData,
  type ServerTableDataLoadContext,
  type ServerTableDataPage,
} from "@/hooks/use-server-table-data";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type UseControlledServerTableOptions<T> = {
  initialSorting: SortingState;
  pageSize?: number;
  debounceMs?: number;
  load: (ctx: ServerTableDataLoadContext) => Promise<ServerTableDataPage<T>>;
  errorMessage: string;
  toastOnError?: boolean;
  refreshKey?: string | number;
  dataScopeKey?: string | number;
};

export type UseControlledServerTableResult<T> = {
  rows: T[];
  total: number;
  isLoading: boolean;
  error: string | null;
  serverSide: DataTableServerSideConfig;
};

export function useControlledServerTable<T>({
  initialSorting,
  pageSize = DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  debounceMs = DEFAULT_SERVER_DATA_TABLE_SEARCH_DEBOUNCE_MS,
  load,
  errorMessage,
  toastOnError,
  refreshKey,
  dataScopeKey,
}: UseControlledServerTableOptions<T>): UseControlledServerTableResult<T> {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [dataScopeKey]);

  const committedSearchRef = useRef<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const committed = searchDraft.trim();
      const previousCommitted = committedSearchRef.current;
      if (previousCommitted !== null && previousCommitted !== committed) {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
      }
      committedSearchRef.current = committed;
      setSearchQuery(committed);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [searchDraft, debounceMs]);

  const handleSortingChange = useCallback((next: SortingState) => {
    setSorting(next);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const { rows, total, isLoading, error } = useServerTableData<T>({
    pagination,
    searchQuery,
    sorting,
    refreshKey,
    dataScopeKey,
    load,
    errorMessage,
    toastOnError,
  });

  const serverSide = useMemo(
    () => ({
      totalRowCount: total,
      pagination,
      onPaginationChange: setPagination,
      sorting,
      onSortingChange: handleSortingChange,
      search: searchDraft,
      onSearchChange: setSearchDraft,
    }),
    [total, pagination, sorting, handleSortingChange, searchDraft],
  );

  return { rows, total, isLoading, error, serverSide };
}
