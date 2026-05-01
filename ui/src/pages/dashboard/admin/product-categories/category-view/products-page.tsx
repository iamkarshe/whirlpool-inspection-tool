import SkeletonTable from "@/components/skeleton7";
import type { ProductCategoryViewContext } from "@/pages/dashboard/admin/product-categories/category-view/context";
import ProductCategoryProductsDataTable from "@/pages/dashboard/admin/product-categories/category-view/product-category-products-data-table";
import { useProductCategoryProducts } from "@/pages/dashboard/admin/product-categories/category-view/use-product-category-products";
import { useOutletContext } from "react-router-dom";

export default function ProductCategoryProductsPage() {
  const { categoryUuid } = useOutletContext<ProductCategoryViewContext>();
  const { products, loading } = useProductCategoryProducts(categoryUuid);

  if (loading) return <SkeletonTable />;

  return <ProductCategoryProductsDataTable rows={products} />;
}

