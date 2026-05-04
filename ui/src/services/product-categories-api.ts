import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import { getProductCategories } from "@/api/generated/product-categories/product-categories";
import type { GetProductCategoriesApiProductCategoriesGetParams } from "@/api/generated/model/getProductCategoriesApiProductCategoriesGetParams";
import type { ProductCategoryListResponse } from "@/api/generated/model/productCategoryListResponse";
import type { ProductCategoryListItemResponse } from "@/api/generated/model/productCategoryListItemResponse";
import type { ProductResponse } from "@/api/generated/model/productResponse";

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

/**
 * Resolves the category UUID for a product using paged list calls, preferring
 * `search` with the product's category name so usually only one or two requests run.
 */
export async function resolveProductCategoryUuidForProduct(
  product: ProductResponse,
  request?: { signal?: AbortSignal },
): Promise<string | null> {
  const signal = request?.signal;
  const targetId = product.product_category_id;
  const name = product.product_category_name?.trim();

  const scanPages = async (search: string | null) => {
    let page = 1;
    let totalPages = 1;
    do {
      const res = await fetchProductCategoriesPage(
        {
          page,
          per_page: 100,
          search: search && search.length > 0 ? search : null,
          sort_by: "id",
          sort_dir: "desc",
        },
        { signal },
      );
      const hit = res.data.find((c) => c.id === targetId);
      if (hit) return hit.uuid;
      totalPages = Math.max(1, res.total_pages ?? 1);
      page += 1;
    } while (page <= totalPages);
    return null;
  };

  if (name) {
    const byName = await scanPages(name);
    if (byName) return byName;
  }
  return scanPages(null);
}

/**
 * Fetches **every** page of product categories. Avoid in UI routes; prefer
 * {@link fetchProductCategoriesPage} or {@link resolveProductCategoryUuidForProduct}.
 */
export async function fetchAllProductCategories(
  request?: { signal?: AbortSignal },
): Promise<ProductCategoryListItemResponse[]> {
  const api = getProductCategories();
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const rows: ProductCategoryListItemResponse[] = [];

  while (page <= totalPages) {
    const res = await api.getProductCategoriesApiProductCategoriesGet(
      {
        page,
        per_page: perPage,
        sort_by: "id",
        sort_dir: "desc",
      },
      request?.signal ? { signal: request.signal } : undefined,
    );
    rows.push(...res.data);
    totalPages = Math.max(1, res.total_pages ?? 1);
    page += 1;
  }

  return rows;
}
