import SkeletonTable from "@/components/skeleton7";
import type { ProductCategory } from "@/pages/dashboard/admin/product-categories/product-category-service";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useCategoryInspections } from "./use-category-inspections";
import type { DateRange } from "react-day-picker";

type Ctx = { categoryId: number; category: ProductCategory | null; dateRange?: DateRange | undefined };

export default function ProductCategoryInboundFailedInspectionsPage() {
  const { categoryId, dateRange } = useOutletContext<Ctx>();
  const { inspections, statusMap, failedIds, loading } = useCategoryInspections(
    categoryId,
    dateRange,
  );
  const list = useMemo(
    () =>
      inspections.filter(
        (i) => i.inspection_type === "inbound" && failedIds.has(i.id),
      ),
    [failedIds, inspections],
  );
  if (loading) return <SkeletonTable />;
  return (
    <InspectionsDataTable
      data={list}
      downloadCsvFileName={`product-category-${categoryId}-inbound-failed-inspections.csv`}
      downloadCsv={(rows) => ({
        headers: [
          "id",
          "created_at",
          "inspection_type",
          "status",
          "inspector_name",
          "product_serial",
          "device_fingerprint",
          "checklist_name",
        ],
        rows: rows.map((i) => ({
          id: i.id,
          created_at: i.created_at,
          inspection_type: i.inspection_type,
          status: statusMap?.[i.id] ?? "",
          inspector_name: i.inspector_name,
          product_serial: i.product_serial,
          device_fingerprint: i.device_fingerprint,
          checklist_name: i.checklist_name,
        })),
      })}
    />
  );
}

