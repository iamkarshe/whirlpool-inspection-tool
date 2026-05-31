import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import { getProductCategories } from "@/api/generated/product-categories/product-categories";
import type { ProductCategoryInspectionListResponse } from "@/api/generated/model/productCategoryInspectionListResponse";
import type { ProductCategoryInspectionResponse } from "@/api/generated/model/productCategoryInspectionResponse";
import type { ProductCategoryResponse } from "@/api/generated/model/productCategoryResponse";
import type { ProductResponse } from "@/api/generated/model/productResponse";

export type ProductCategoryInspectionQuery = {
  date_from?: string | null;
  date_to?: string | null;
  date_field?: string | null;
  is_active?: boolean;
};

export type ProductCategoryInspectionsPageParams = ProductCategoryInspectionQuery & {
  page?: number;
  per_page?: number;
  search?: string | null;
  sort_by?: string | null;
  sort_dir?: string;
};

export async function fetchProductCategoryDetail(
  categoryUuid: string,
  signal?: AbortSignal,
): Promise<ProductCategoryResponse> {
  const api = getProductCategories();
  return api.getProductCategoryApiProductCategoriesProductCategoryUuidGet(
    categoryUuid,
    signal ? { signal } : undefined,
  );
}

export async function fetchProductCategoryProducts(
  categoryUuid: string,
  signal?: AbortSignal,
): Promise<ProductResponse[]> {
  const api = getProductCategories();
  const res =
    await api.getProductCategoryProductsApiProductCategoriesProductCategoryUuidProductsGet(
      categoryUuid,
      undefined,
      signal ? { signal } : undefined,
    );
  return res.data;
}

export async function fetchProductCategoryInspectionsPage(
  categoryUuid: string,
  params: ProductCategoryInspectionsPageParams,
  signal?: AbortSignal,
): Promise<ProductCategoryInspectionListResponse> {
  const api = getProductCategories();
  return api.getProductCategoryInspectionsApiProductCategoriesProductCategoryUuidInspectionsGet(
    categoryUuid,
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search.trim() : null,
      sort_by: params.sort_by ?? "created_at",
      sort_dir: params.sort_dir ?? "desc",
      date_field: params.date_field ?? "created_at",
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      is_active: params.is_active,
    },
    signal ? { signal } : undefined,
  );
}

/**
 * Loads every page — avoid in UI; prefer {@link fetchProductCategoryInspectionsPage}.
 */
export async function fetchAllProductCategoryInspections(
  categoryUuid: string,
  query?: ProductCategoryInspectionQuery,
  signal?: AbortSignal,
): Promise<ProductCategoryInspectionResponse[]> {
  const api = getProductCategories();
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const rows: ProductCategoryInspectionResponse[] = [];

  while (page <= totalPages) {
    const res =
      await api.getProductCategoryInspectionsApiProductCategoriesProductCategoryUuidInspectionsGet(
        categoryUuid,
        {
          page,
          per_page: perPage,
          date_field: query?.date_field ?? "created_at",
          date_from: query?.date_from ?? null,
          date_to: query?.date_to ?? null,
          is_active: query?.is_active,
        },
        signal ? { signal } : undefined,
      );
    rows.push(...res.data);
    totalPages = Math.max(1, res.total_pages ?? 1);
    page += 1;
  }

  return rows;
}
