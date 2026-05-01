import { DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE } from "@/components/ui/data-table-server";
import type { GetProductsApiProductsGetParams } from "@/api/generated/model/getProductsApiProductsGetParams";
import type { ProductListItemResponse } from "@/api/generated/model/productListItemResponse";
import type { ProductListResponse } from "@/api/generated/model/productListResponse";
import type { ProductResponse } from "@/api/generated/model/productResponse";
import { getProducts } from "@/api/generated/products/products";

export type ProductsListParams = Pick<
  GetProductsApiProductsGetParams,
  "page" | "per_page" | "search" | "sort_by" | "sort_dir" | "date_field" | "date_from" | "date_to" | "is_active"
>;

export async function fetchProductsPage(
  params: ProductsListParams,
  request?: { signal?: AbortSignal },
): Promise<ProductListResponse> {
  const api = getProducts();
  return api.getProductsApiProductsGet(
    {
      page: params.page ?? 1,
      per_page: params.per_page ?? DEFAULT_SERVER_DATA_TABLE_PAGE_SIZE,
      search: params.search?.trim() ? params.search : null,
      sort_by: params.sort_by ?? "id",
      sort_dir: params.sort_dir ?? "desc",
      date_field: params.date_field ?? null,
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
      is_active: params.is_active,
    },
    request?.signal ? { signal: request.signal } : undefined,
  );
}

export async function fetchAllProducts(
  request?: { signal?: AbortSignal },
): Promise<ProductListItemResponse[]> {
  const api = getProducts();
  const perPage = 100;
  let page = 1;
  let totalPages = 1;
  const rows: ProductListItemResponse[] = [];

  while (page <= totalPages) {
    const res = await api.getProductsApiProductsGet(
      { page, per_page: perPage, sort_by: "id", sort_dir: "desc" },
      request?.signal ? { signal: request.signal } : undefined,
    );
    rows.push(...res.data);
    totalPages = Math.max(1, res.total_pages ?? 1);
    page += 1;
  }

  return rows;
}

export async function fetchProductDetail(
  productUuid: string,
  request?: { signal?: AbortSignal },
): Promise<ProductResponse> {
  const api = getProducts();
  return api.getProductApiProductsProductUuidGet(
    productUuid,
    request?.signal ? { signal: request.signal } : undefined,
  );
}
