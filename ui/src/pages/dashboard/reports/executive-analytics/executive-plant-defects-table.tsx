import type { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { DefectsPlantItem } from "@/api/generated/model/defectsPlantItem";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

/** Plants at or above this defect % are highlighted in the table. */
const HIGH_DEFECT_RATE_PCT = 5;

function plantRowClassName(row: DefectsPlantItem) {
  if (row.defective_pct < HIGH_DEFECT_RATE_PCT) return undefined;
  return "bg-red-50/70 hover:bg-red-50/90 dark:bg-red-950/40 dark:hover:bg-red-950/55";
}

function SortableHeader({
  column,
  label,
  align = "left",
}: {
  column: Column<DefectsPlantItem, unknown>;
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
        <ArrowUpDown
          className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50"
          aria-hidden
        />
      )}
    </Button>
  );
}

const columns: ColumnDef<DefectsPlantItem>[] = [
  {
    id: "plant",
    accessorFn: (row) => row.plant_code,
    header: ({ column }) => (
      <SortableHeader column={column} label="Plant" align="left" />
    ),
    cell: ({ row }) => (
      <div className="min-w-[140px]">
        <span className="font-medium">{row.original.plant_code}</span>
        <span className="text-muted-foreground">
          {" "}
          — {row.original.plant_name}
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

export function ExecutivePlantDefectsTable({
  data,
  isLoading,
}: {
  data: DefectsPlantItem[];
  isLoading?: boolean;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="plant_name"
      showDateRangePicker={false}
      showAllRows
      rangeLabel="plants"
      isLoading={isLoading}
      getRowClassName={plantRowClassName}
      downloadCsvFileName="executive-plant-defects.csv"
      downloadCsv={(rows) => ({
        headers: [
          "Plant code",
          "Plant name",
          "Total inspections",
          "Defective inspections",
          "Defect %",
          "DGR",
          "LDGR",
          "SCRAP",
        ],
        rows: rows.map((row) => ({
          "Plant code": row.plant_code,
          "Plant name": row.plant_name,
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
