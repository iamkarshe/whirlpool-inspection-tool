import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type ServerTableDataLoadContext = {
  signal: AbortSignal;
  pagination: PaginationState;
  searchQuery: string;
  sorting: SortingState;
};

export type ServerTableDataPage<T> = {
  data: T[];
  total: number;
};

export type UseServerTableDataOptions<T> = {
  pagination: PaginationState;
  searchQuery: string;
  sorting: SortingState;
  load: (ctx: ServerTableDataLoadContext) => Promise<ServerTableDataPage<T>>;
  errorMessage: string;
  toastOnError?: boolean;
};

export type UseServerTableDataResult<T> = {
  rows: T[];
  total: number;
  isLoading: boolean;
  error: string | null;
};

export function useServerTableData<T>({
  pagination,
  searchQuery,
  sorting,
  load,
  errorMessage,
  toastOnError = true,
}: UseServerTableDataOptions<T>): UseServerTableDataResult<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRef = useRef(load);
  loadRef.current = load;

  const errorMessageRef = useRef(errorMessage);
  errorMessageRef.current = errorMessage;
  const toastOnErrorRef = useRef(toastOnError);
  toastOnErrorRef.current = toastOnError;

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await loadRef.current({
          signal: ac.signal,
          pagination,
          searchQuery,
          sorting,
        });
        if (cancelled) return;
        setRows(res.data);
        setTotal(res.total);
      } catch (e: unknown) {
        if (cancelled || ac.signal.aborted) return;
        const message =
          e instanceof Error ? e.message : errorMessageRef.current;
        setError(message);
        setRows([]);
        setTotal(0);
        if (toastOnErrorRef.current) toast.error(message);
      } finally {
        if (!cancelled && !ac.signal.aborted) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [pagination.pageIndex, pagination.pageSize, searchQuery, sorting]);

  return { rows, total, isLoading, error };
}