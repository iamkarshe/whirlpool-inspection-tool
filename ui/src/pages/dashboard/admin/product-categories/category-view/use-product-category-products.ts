import type { ProductResponse } from "@/api/generated/model/productResponse";
import { fetchProductCategoryProducts } from "@/services/product-category-view-api";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useProductCategoryProducts(categoryUuid: string) {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchProductCategoryProducts(categoryUuid, ac.signal);
        if (cancelled) return;
        setProducts(data);
      } catch (e: unknown) {
        if (cancelled || ac.signal.aborted) return;
        const message =
          e instanceof Error ? e.message : "Failed to load products.";
        toast.error(message);
        setProducts([]);
      } finally {
        if (!cancelled && !ac.signal.aborted) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [categoryUuid]);

  return { products, loading };
}
