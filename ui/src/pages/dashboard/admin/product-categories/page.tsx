import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerTableData } from "@/hooks/use-server-table-data";
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { toast } from "sonner";

import type { ProductCategoryListItemResponse } from "@/api/generated/model/productCategoryListItemResponse";
import CsvUploadDialog from "@/components/csv-upload-dialog";
import ConfirmDeleteDialog from "@/components/dialog-confirm-delete";
import PageActionBar from "@/components/page-action-bar";
import {
  DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  DEFAULT_SERVER_DATA_TABLE_SEARCH_DEBOUNCE_MS,
  sortingStateToApiSortQuery,
} from "@/components/ui/data-table-server";
import ProductCategoriesDataTable from "@/pages/dashboard/admin/product-categories/data-table";
import { fetchProductCategoriesPage } from "@/services/product-categories-api";
import { uploadSkusCsv, uploadSkusCsvErrorMessage } from "@/services/skus-api";

const PRODUCT_CATEGORY_LIST_SORT = {
  allowedColumns: ["id", "name", "created_at", "updated_at"] as const,
  defaultSort: { sort_by: "id", sort_dir: "desc" as const },
};

export default function ProductCategoriesPage() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "id", desc: true },
  ]);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [categoryToDelete, setCategoryToDelete] =
    useState<ProductCategoryListItemResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const {
    rows,
    total,
    isLoading,
    error: loadError,
  } = useServerTableData<ProductCategoryListItemResponse>({
    pagination,
    searchQuery,
    sorting,
    errorMessage: "Failed to load product categories.",
    load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(
        s,
        PRODUCT_CATEGORY_LIST_SORT,
      );
      const res = await fetchProductCategoriesPage(
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

  const handleCsvSubmit = async (file: File) => {
    try {
      await uploadSkusCsv(file);
      toast.success("SKU CSV uploaded.");
    } catch (e: unknown) {
      toast.error(uploadSkusCsvErrorMessage(e));
      throw e;
    }
  };

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
        title="Product Categories"
        description="Manage master data for all product categories."
      >
        <CsvUploadDialog
          title="Upload Products"
          description="Select a CSV file containing products to import."
          templateFilename="skus-template.csv"
          templateDownloadUrl="/api/skus/csv/template"
          onSubmit={handleCsvSubmit}
        />
      </PageActionBar>

      {loadError && !isLoading ? (
        <p className="text-destructive text-sm">{loadError}</p>
      ) : null}

      <ProductCategoriesDataTable
        data={rows}
        serverSide={serverSide}
        isLoading={isLoading}
        onDeleteCategory={(category) => setCategoryToDelete(category)}
      />

      <ConfirmDeleteDialog
        open={categoryToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryToDelete(null);
          }
        }}
        entityLabel="product category"
        title="Delete product category?"
        description={
          categoryToDelete
            ? `You are about to permanently delete the product category "${categoryToDelete.name}". This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete category"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!categoryToDelete) return;
          try {
            setIsDeleting(true);
            toast.info(
              "Delete product category API is not available in the client yet.",
            );
          } finally {
            setIsDeleting(false);
            setCategoryToDelete(null);
          }
        }}
      />
    </div>
  );
}
