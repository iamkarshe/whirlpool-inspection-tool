import SkeletonTable from "@/components/skeleton7";
import ProductsDataTable from "@/pages/dashboard/admin/products/data-table";
import { getProducts, type Product } from "@/pages/dashboard/admin/products/product-service";
import type { ProductCategory } from "@/pages/dashboard/admin/product-categories/product-category-service";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type Ctx = { categoryId: number; category: ProductCategory | null };

export default function ProductCategoryProductsPage() {
  const { categoryId } = useOutletContext<Ctx>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    getProducts()
      .then((list) => {
        if (cancelled) return;
        setProducts(list.filter((p) => p.product_category_id === categoryId));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  if (loading) return <SkeletonTable />;

  return <ProductsDataTable data={products} />;
}

