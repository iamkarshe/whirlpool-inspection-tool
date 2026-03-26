import SkeletonTable from "@/components/skeleton7";
import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import type { Product } from "@/pages/dashboard/admin/products/product-service";
import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { useProductInspections } from "./use-product-inspections";

type Ctx = { productId: number; product: Product | null; dateRange?: DateRange | undefined };

export default function ProductOutboundInspectionsPage() {
  const { productId, product, dateRange } = useOutletContext<Ctx>();
  const serial = product?.serial_number ?? "";
  const { inspections, statusMap, loading } = useProductInspections(serial, dateRange);
  const list = useMemo(
    () => inspections.filter((i) => i.inspection_type === "outbound"),
    [inspections],
  );
  if (loading) return <SkeletonTable />;

  return (
    <InspectionsDataTable
      data={list}
      downloadCsvFileName={`product-${productId}-outbound-inspections.csv`}
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

