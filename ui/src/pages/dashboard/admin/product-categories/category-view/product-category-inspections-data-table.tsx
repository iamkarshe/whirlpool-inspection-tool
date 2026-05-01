import type { ProductCategoryInspectionResponse } from "@/api/generated/model/productCategoryInspectionResponse";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import { formatDate } from "@/lib/core";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Link } from "react-router-dom";

const columns: ColumnDef<ProductCategoryInspectionResponse>[] = [
  {
    accessorKey: "uuid",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Inspection
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        to={PAGES.inspectionViewPath(row.original.uuid)}
        className="font-mono text-sm text-primary hover:underline"
      >
        {row.original.uuid}
      </Link>
    ),
  },
  {
    accessorKey: "inspection_type",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Type
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "inspector_name",
    header: "Inspector",
  },
  {
    accessorKey: "product_id",
    header: "Product",
    cell: ({ row }) => (
      <span className="font-mono text-sm">#{row.original.product_id}</span>
    ),
  },
  {
    accessorKey: "plant_code",
    header: "Plant",
    cell: ({ row }) => row.original.plant_code ?? "—",
  },
  {
    accessorKey: "warehouse_code",
    header: "Warehouse",
    cell: ({ row }) => row.original.warehouse_code ?? "—",
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => formatDate(row.original.created_at),
  },
];

export default function ProductCategoryInspectionsDataTable({
  rows,
  downloadFileName,
}: {
  rows: ProductCategoryInspectionResponse[];
  downloadFileName: string;
}) {
  return (
    <DataTable<ProductCategoryInspectionResponse>
      columns={columns}
      data={rows}
      searchKey="uuid"
      rangeLabel="inspections"
      downloadCsvFileName={downloadFileName}
      downloadCsv={(data) => ({
        headers: [
          "id",
          "uuid",
          "inspector_id",
          "inspector_name",
          "device_id",
          "inspection_type",
          "product_id",
          "warehouse_code",
          "plant_code",
          "created_at",
        ],
        rows: data.map((i) => ({
          id: i.id,
          uuid: i.uuid,
          inspector_id: i.inspector_id,
          inspector_name: i.inspector_name,
          device_id: i.device_id,
          inspection_type: i.inspection_type,
          product_id: i.product_id,
          warehouse_code: i.warehouse_code,
          plant_code: i.plant_code,
          created_at: i.created_at,
        })),
      })}
    />
  );
}
