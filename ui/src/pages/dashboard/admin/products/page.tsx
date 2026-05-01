import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PaginationState, SortingState } from "@tanstack/react-table";

import { useServerTableData } from "@/hooks/use-server-table-data";
import type { ProductListItemResponse } from "@/api/generated/model/productListItemResponse";
import PageActionBar from "@/components/page-action-bar";
import {
  DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  DEFAULT_SERVER_DATA_TABLE_SEARCH_DEBOUNCE_MS,
  sortingStateToApiSortQuery,
} from "@/components/ui/data-table-server";
import { fetchProductsPage } from "@/services/products-api";
import ProductsDataTable from "./data-table";

const PRODUCT_LIST_SORT = {
  allowedColumns: ["id", "material_code", "created_at", "updated_at"] as const,
  defaultSort: { sort_by: "id", sort_dir: "desc" as const },
};

export default function ProductsPage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "id", desc: true }]);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    }, DEFAULT_SERVER_DATA_TABLE_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  const handleSortingChange = useCallback((next: SortingState) => {
    setSorting(next);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const { rows, total, isLoading, error } = useServerTableData<ProductListItemResponse>({
    pagination,
    searchQuery,
    sorting,
    errorMessage: "Failed to load products.",
    load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(s, PRODUCT_LIST_SORT);
      const res = await fetchProductsPage(
        {
          page: p.pageIndex + 1,
          per_page: p.pageSize,
          search: q.length > 0 ? q : null,
          sort_by,
          sort_dir,
        },
        { signal },
      );
      return { data: res.data, total: res.total };
    },
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

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Products"
        description="Manage master data for all products."
      />

      {error && !isLoading ? <p className="text-destructive text-sm">{error}</p> : null}

      <ProductsDataTable
        data={rows}
        serverSide={serverSide}
        isLoading={isLoading}
      />
    </div>
  );
}
