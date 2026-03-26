import SkeletonTable from "@/components/skeleton7";
import type { ProductCategory } from "@/pages/dashboard/admin/product-categories/product-category-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useCategoryInspections } from "./use-category-inspections";

type Ctx = { categoryId: number; category: ProductCategory | null };

export default function ProductCategoryOutboundInspectionsPage() {
  const { categoryId } = useOutletContext<Ctx>();
  const { inspections, loading } = useCategoryInspections(categoryId);
  const list = useMemo(
    () => inspections.filter((i) => i.inspection_type === "outbound"),
    [inspections],
  );
  if (loading) return <SkeletonTable />;
  return <InspectionsDataTable data={list} />;
}

