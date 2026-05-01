import { useEffect, useState } from "react";

import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import {
  getProducts,
  type Product,
} from "@/pages/dashboard/admin/products/product-service";
import ProductsDataTable from "./data-table";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsData = await getProducts();
        setProducts(productsData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Products"
        description="Manage master data for all products."
      />

      {isLoading ? <SkeletonTable /> : <ProductsDataTable data={products} />}
    </div>
  );
}
