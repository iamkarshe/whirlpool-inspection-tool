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

  return (
    <ProductsDataTable
      data={products}
      downloadCsvFileName={`product-category-${categoryId}-products.csv`}
      downloadCsv={(rows) => ({
        headers: [
          "id",
          "product_category_id",
          "category_name",
          "serial_number",
          "manufacturing_date",
          "batch_number",
        ],
        rows: rows.map((p) => ({
          id: p.id,
          product_category_id: p.product_category_id,
          category_name: p.category_name,
          serial_number: p.serial_number,
          manufacturing_date: p.manufacturing_date,
          batch_number: p.batch_number,
        })),
      })}
    />
  );
}

