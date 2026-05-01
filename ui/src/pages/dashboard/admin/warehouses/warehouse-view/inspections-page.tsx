import type { InspectionListItemResponse } from "@/api/generated/model/inspectionListItemResponse";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { PAGES } from "@/endpoints";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import { formatDate } from "@/lib/core";
import { fetchWarehouseInspectionsPage } from "@/services/warehouses-api";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Link, useOutletContext } from "react-router-dom";
import type { WarehouseViewContext } from "./context";

const WAREHOUSE_INSPECTIONS_SORT = {
  allowedColumns: ["id", "inspection_type", "created_at", "updated_at"] as const,
  defaultSort: { sort_by: "created_at", sort_dir: "desc" as const },
};

const columns: ColumnDef<InspectionListItemResponse>[] = [
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
      <Link to={PAGES.inspectionViewPath(row.original.uuid)} className="text-primary hover:underline font-mono text-xs">
        {row.original.uuid}
      </Link>
    ),
  },
  { accessorKey: "inspector_name", header: "Inspector" },
  { accessorKey: "inspection_type", header: "Type" },
  {
    accessorKey: "product_id",
    header: "Product",
    cell: ({ row }) => <span className="font-mono text-xs">#{row.original.product_id}</span>,
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

export default function WarehouseViewInspectionsPage() {
  const { warehouse } = useOutletContext<WarehouseViewContext>();

  const { rows, isLoading, serverSide } =
    useControlledServerTable<InspectionListItemResponse>({
      initialSorting: [{ id: "created_at", desc: true }],
      dataScopeKey: warehouse.uuid,
      errorMessage: "Failed to load warehouse inspections.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          WAREHOUSE_INSPECTIONS_SORT,
        );
        const res = await fetchWarehouseInspectionsPage(
          {
            warehouse_uuid: warehouse.uuid,
            page: p.pageIndex + 1,
            per_page: p.pageSize,
            search: q.length > 0 ? q : null,
            sort_by,
            sort_dir,
          },
          { signal },
        );
        return { data: res.data, total: res.total };
      },
    });

  return (
    <DataTable
      columns={columns}
      data={rows}
      rangeLabel="inspections"
      serverSide={serverSide}
      isLoading={isLoading}
    />
  );
}
