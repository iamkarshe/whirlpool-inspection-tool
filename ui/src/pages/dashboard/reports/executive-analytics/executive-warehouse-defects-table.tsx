import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { DefectsWarehouseItem } from "@/api/generated/model/defectsWarehouseItem";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

function SortableHeader({
  column,
  label,
  align = "left",
}: {
  column: Column<DefectsWarehouseItem, unknown>;
  label: string;
  align?: "left" | "right";
}) {
  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 px-2 font-medium",
        align === "left" ? "-ml-3" : "ml-auto -mr-3",
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      <span className={cn(align === "right" && "w-full text-right")}>
        {label}
      </span>
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <ArrowUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
      )}
    </Button>
  );
}

const columns: ColumnDef<DefectsWarehouseItem>[] = [
  {
    id: "warehouse",
    accessorFn: (row) => row.warehouse_code,
    header: ({ column }) => (
      <SortableHeader column={column} label="Warehouse" align="left" />
    ),
    cell: ({ row }) => (
      <div className="min-w-[140px]">
        <span className="font-medium">{row.original.warehouse_code}</span>
        <span className="text-muted-foreground">
          {" "}
          — {row.original.warehouse_name}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "total_inspections",
    header: ({ column }) => (
      <SortableHeader column={column} label="Total" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.total_inspections)}
      </span>
    ),
  },
  {
    accessorKey: "defective_inspections",
    header: ({ column }) => (
      <SortableHeader column={column} label="Defective" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.defective_inspections)}
      </span>
    ),
  },
  {
    accessorKey: "defective_pct",
    header: ({ column }) => (
      <SortableHeader column={column} label="Defect %" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatPct(row.original.defective_pct)}
      </span>
    ),
  },
  {
    id: "dgr",
    accessorFn: (row) => row.grading_defects.dgr ?? 0,
    header: ({ column }) => (
      <SortableHeader column={column} label="DGR" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.dgr ?? 0)}
      </span>
    ),
  },
  {
    id: "ldgr",
    accessorFn: (row) => row.grading_defects.ldgr ?? 0,
    header: ({ column }) => (
      <SortableHeader column={column} label="LDGR" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.ldgr ?? 0)}
      </span>
    ),
  },
  {
    id: "scrap",
    accessorFn: (row) => row.grading_defects.scrap ?? 0,
    header: ({ column }) => (
      <SortableHeader column={column} label="SCRAP" align="right" />
    ),
    cell: ({ row }) => (
      <span className="block text-right tabular-nums">
        {formatCount(row.original.grading_defects.scrap ?? 0)}
      </span>
    ),
  },
];

export function ExecutiveWarehouseDefectsTable({
  data,
  isLoading,
}: {
  data: DefectsWarehouseItem[];
  isLoading?: boolean;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="warehouse_name"
      showDateRangePicker={false}
      showAllRows
      rangeLabel="warehouses"
      isLoading={isLoading}
      downloadCsvFileName="executive-warehouse-defects.csv"
      downloadCsv={(rows) => ({
        headers: [
          "Warehouse code",
          "Warehouse name",
          "Total inspections",
          "Defective inspections",
          "Defect %",
          "DGR",
          "LDGR",
          "SCRAP",
        ],
        rows: rows.map((row) => ({
          "Warehouse code": row.warehouse_code,
          "Warehouse name": row.warehouse_name,
          "Total inspections": row.total_inspections,
          "Defective inspections": row.defective_inspections,
          "Defect %": row.defective_pct,
          DGR: row.grading_defects.dgr ?? 0,
          LDGR: row.grading_defects.ldgr ?? 0,
          SCRAP: row.grading_defects.scrap ?? 0,
        })),
      })}
    />
  );
}
