import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { DefectsTruckItem } from "@/api/generated/model/defectsTruckItem";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

/** Trucks at or above this defect % are highlighted in the table. */
const HIGH_DEFECT_RATE_PCT = 1;

const ALIGN_RIGHT = { align: "right" as const };

function truckRowClassName(row: DefectsTruckItem) {
  if (row.defective_pct < HIGH_DEFECT_RATE_PCT) return undefined;
  return "bg-red-50/70 hover:bg-red-50/90 dark:bg-red-950/40 dark:hover:bg-red-950/55";
}

function SortableHeader({
  column,
  label,
  align = "left",
}: {
  column: Column<DefectsTruckItem, unknown>;
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
        align === "right"
          ? "-mr-3 flex w-full justify-end"
          : "-ml-3 justify-start",
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
        <ArrowUpDown
          className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50"
          aria-hidden
        />
      )}
    </Button>
  );
}

const columns: ColumnDef<DefectsTruckItem>[] = [
  {
    accessorKey: "truck_number",
    header: ({ column }) => (
      <SortableHeader column={column} label="Truck number" align="left" />
    ),
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.truck_number}</span>
    ),
  },
  {
    accessorKey: "total_inspections",
    meta: ALIGN_RIGHT,
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
    meta: ALIGN_RIGHT,
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
    meta: ALIGN_RIGHT,
    header: ({ column }) => (
      <SortableHeader column={column} label="Defect %" align="right" />
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          "block text-right tabular-nums",
          row.original.defective_pct >= HIGH_DEFECT_RATE_PCT &&
            "font-semibold text-red-700 dark:text-red-400",
        )}
      >
        {formatPct(row.original.defective_pct)}
      </span>
    ),
  },
];

export function ExecutiveTruckDefectsTable({
  data,
  isLoading,
}: {
  data: DefectsTruckItem[];
  isLoading?: boolean;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="truck_number"
      showDateRangePicker={false}
      showAllRows
      rangeLabel="trucks"
      isLoading={isLoading}
      getRowClassName={truckRowClassName}
      downloadCsvFileName="executive-truck-defects.csv"
      downloadCsv={(rows) => ({
        headers: [
          "Truck number",
          "Total inspections",
          "Defective inspections",
          "Defect %",
        ],
        rows: rows.map((row) => ({
          "Truck number": row.truck_number,
          "Total inspections": row.total_inspections,
          "Defective inspections": row.defective_inspections,
          "Defect %": row.defective_pct,
        })),
      })}
    />
  );
}
