import { getProductCategories } from "@/api/generated/product-categories/product-categories";
import type { ProductCategoryInspectionResponse } from "@/api/generated/model/productCategoryInspectionResponse";
import type { ProductCategoryResponse } from "@/api/generated/model/productCategoryResponse";
import type { ProductResponse } from "@/api/generated/model/productResponse";

export type ProductCategoryInspectionQuery = {
  date_from?: string | null;
  date_to?: string | null;
  date_field?: string | null;
  is_active?: boolean;
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
