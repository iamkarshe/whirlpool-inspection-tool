import { useCallback } from "react";
import { toast } from "sonner";

import type { ProductCategoryListItemResponse } from "@/api/generated/model/productCategoryListItemResponse";
import {
  CsvUploadHowToDialog,
  type CsvUploadHowToStep,
} from "@/components/csv-upload-how-to-dialog";
import CsvUploadDialog from "@/components/csv-upload-dialog";
import PageActionBar from "@/components/page-action-bar";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import type { ServerTableDataLoadContext } from "@/hooks/use-server-table-data";
import ProductCategoriesDataTable from "@/pages/dashboard/admin/product-categories/data-table";
import { fetchProductCategoriesPage } from "@/services/product-categories-api";
import { uploadSkusCsv, uploadSkusCsvErrorMessage } from "@/services/skus-api";

const PRODUCT_CATEGORY_LIST_SORT = {
  allowedColumns: ["id", "name", "created_at", "updated_at"] as const,
  defaultSort: { sort_by: "id", sort_dir: "desc" as const },
};

const PRODUCT_CATEGORY_INITIAL_SORTING = [{ id: "id", desc: true }] as const;

const PRODUCT_CSV_HOW_TO_STEPS: CsvUploadHowToStep[] = [
  {
    title: "Download the CSV template",
    description:
      'Click Upload Products, then Template CSV. Save the file somewhere you can find it on your computer.',
  },
  {
    title: "Update existing products",
    description:
      "Open the file in Excel or Google Sheets. Find the product you want to change and edit its details. Keep the product code the same so the system knows which row to update.",
  },
  {
    title: "Add new products",
    description:
      "Add a new row at the bottom with every required column filled in. Use a product code that is not already in the file.",
  },
  {
    title: "Upload your file",
    description:
      'Click Upload Products, choose your saved CSV, and press Upload. Wait for the success message before closing.',
  },
];

export default function ProductCategoriesPage() {
  const loadProductCategories = useCallback(
    async ({
      signal,
      pagination: p,
      searchQuery: q,
      sorting: s,
    }: ServerTableDataLoadContext) => {
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
    [],
  );

  const { rows, isLoading, error: loadError, serverSide } =
    useControlledServerTable<ProductCategoryListItemResponse>({
      initialSorting: [...PRODUCT_CATEGORY_INITIAL_SORTING],
      errorMessage: "Failed to load product categories.",
      load: loadProductCategories,
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
        <CsvUploadHowToDialog
          title="How to upload products"
          intro="Use a spreadsheet to bulk update or add products. You do not need to re-type everything by hand."
          steps={PRODUCT_CSV_HOW_TO_STEPS}
          footerNote="When you upload, matching products are updated and new rows are added. Existing products are not removed from the system."
        />
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
      />
    </div>
  );
}
