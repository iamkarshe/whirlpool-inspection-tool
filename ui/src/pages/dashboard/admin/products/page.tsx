import type { ProductListItemResponse } from "@/api/generated/model/productListItemResponse";
import PageActionBar from "@/components/page-action-bar";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import { fetchProductsPage } from "@/services/products-api";
import ProductsDataTable from "./data-table";

const PRODUCT_LIST_SORT = {
  allowedColumns: ["id", "material_code", "created_at", "updated_at"] as const,
  defaultSort: { sort_by: "id", sort_dir: "desc" as const },
};

export default function ProductsPage() {
  const { rows, isLoading, error, serverSide } =
    useControlledServerTable<ProductListItemResponse>({
      initialSorting: [{ id: "id", desc: true }],
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

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Products"
        description="Manage master data for all products."
      />

      {error && !isLoading ? <p className="text-destructive text-sm">{error}</p> : null}

      <ProductsDataTable data={rows} serverSide={serverSide} isLoading={isLoading} />
    </div>
  );
}
