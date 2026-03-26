import SkeletonTable from "@/components/skeleton7";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { ProductCategory } from "@/pages/dashboard/admin/product-categories/product-category-service";
import { useOutletContext } from "react-router-dom";
import { useCategoryInspections } from "./use-category-inspections";

type Ctx = { categoryId: number; category: ProductCategory | null };

export default function ProductCategoryInspectionsPage() {
  const { categoryId } = useOutletContext<Ctx>();
  const { inspections, loading } = useCategoryInspections(categoryId);
  if (loading) return <SkeletonTable />;
  return <InspectionsDataTable data={inspections} />;
}

