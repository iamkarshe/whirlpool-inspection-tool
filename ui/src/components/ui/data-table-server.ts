import type { SortingState } from "@tanstack/react-table";

/** Default `per_page` / TanStack `pageSize` for server-driven `DataTable` lists. */
export const DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE = 10;

/** Debounce for server search string before refetch (ms). */
export const DEFAULT_SERVER_DATA_TABLE_SEARCH_DEBOUNCE_MS = 350;

export type ServerTableSortApiQuery = {
  sort_by: string;
  sort_dir: "asc" | "desc";
};

export type SortingStateToApiSortQueryConfig = {
  /** TanStack column ids the API allows for `sort_by`. */
  allowedColumns: readonly string[];
  /** Used when sorting is empty or the active column is not in `allowedColumns`. */
  defaultSort: ServerTableSortApiQuery;
};

/**
 * Maps TanStack `SortingState` to typical list query params (`sort_by`, `sort_dir`).
 * Use with `DataTable` `serverSide` + your API fetch.
 */
export function sortingStateToApiSortQuery(
  sorting: SortingState,
  config: SortingStateToApiSortQueryConfig,
): ServerTableSortApiQuery {
  const first = sorting[0];
  if (!first) {
    return { ...config.defaultSort };
  }
  const allowed = new Set(config.allowedColumns);
  const sort_by = allowed.has(first.id)
    ? first.id
    : config.defaultSort.sort_by;
  return {
    sort_by,
    sort_dir: first.desc ? "desc" : "asc",
  };
}
