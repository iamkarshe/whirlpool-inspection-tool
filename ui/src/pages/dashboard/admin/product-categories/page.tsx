import { useState } from "react";
import { toast } from "sonner";

import type { ProductCategoryListItemResponse } from "@/api/generated/model/productCategoryListItemResponse";
import CsvUploadDialog from "@/components/csv-upload-dialog";
import ConfirmDeleteDialog from "@/components/dialog-confirm-delete";
import PageActionBar from "@/components/page-action-bar";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import ProductCategoriesDataTable from "@/pages/dashboard/admin/product-categories/data-table";
import { fetchProductCategoriesPage } from "@/services/product-categories-api";
import { uploadSkusCsv, uploadSkusCsvErrorMessage } from "@/services/skus-api";

const PRODUCT_CATEGORY_LIST_SORT = {
  allowedColumns: ["id", "name", "created_at", "updated_at"] as const,
  defaultSort: { sort_by: "id", sort_dir: "desc" as const },
};

export default function ProductCategoriesPage() {
  const [categoryToDelete, setCategoryToDelete] =
    useState<ProductCategoryListItemResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { rows, isLoading, error: loadError, serverSide } =
    useControlledServerTable<ProductCategoryListItemResponse>({
    initialSorting: [{ id: "id", desc: true }],
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
