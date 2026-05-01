import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import { getProductCategories } from "@/api/generated/product-categories/product-categories";
import type { GetProductCategoriesApiProductCategoriesGetParams } from "@/api/generated/model/getProductCategoriesApiProductCategoriesGetParams";
import type { ProductCategoryListResponse } from "@/api/generated/model/productCategoryListResponse";

export type ProductCategoriesListParams = Pick<
  GetProductCategoriesApiProductCategoriesGetParams,
  "page" | "per_page" | "search" | "sort_by" | "sort_dir" | "is_active"
>;

export async function fetchProductCategoriesPage(
  params: ProductCategoriesListParams,
  request?: { signal?: AbortSignal },
): Promise<ProductCategoryListResponse> {
  const api = getProductCategories();
  return api.getProductCategoriesApiProductCategoriesGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "id",
      sort_dir: params.sort_dir ?? "desc",
      is_active: params.is_active,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
}
