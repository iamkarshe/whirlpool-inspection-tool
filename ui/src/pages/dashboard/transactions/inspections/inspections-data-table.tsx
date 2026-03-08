import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import type { Inspection } from "@/pages/dashboard/transactions/inspections/inspection-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

export type InspectionsDataTableProps = {
  data: Inspection[];
  /** When true, hide the Device column (e.g. on device inspections tab). */
  hideDeviceColumn?: boolean;
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const deviceColumn: ColumnDef<Inspection> = {
  id: "device",
  accessorKey: "device_fingerprint",
  header: ({ column }) => (
    <Button
      className="-ml-3"
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      Device
      <ArrowUpDown className="ml-1 h-4 w-4" />
    </Button>
  ),
  cell: ({ row }) => (
    <Link
      to={PAGES.deviceViewPath(row.original.device_id)}
      className="font-mono text-xs text-primary hover:underline"
    >
      {row.original.device_fingerprint}
    </Link>
  ),
};

export default function InspectionsDataTable({
  data,
  hideDeviceColumn = false,
}: InspectionsDataTableProps) {
  const columns: ColumnDef<Inspection>[] = [
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Inspection ID
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="max-w-[120px] truncate font-mono text-xs">
          {String(row.getValue("id")).slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "inspector_name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Inspector
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.getValue("inspector_name"),
    },
    ...(hideDeviceColumn ? [] : [deviceColumn]),
    {
      accessorKey: "product_serial",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">
          {row.getValue("product_serial")}
        </span>
      ),
    },
    {
      accessorKey: "checklist_name",
      header: "Checklist",
      cell: ({ row }) => row.getValue("checklist_name"),
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
      cell: ({ row }) => {
        const type = row.original.inspection_type;
        return (
          <Badge
            variant={type === "inbound" ? "secondary" : "default"}
            className="uppercase"
          >
            {type}
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue) => {
        const v = row.getValue("inspection_type") as string;
        if (filterValue === "inbound") return v === "inbound";
        if (filterValue === "outbound") return v === "outbound";
        return true;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDate(row.original.created_at),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View inspection</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filters: DataTableFilter<Inspection>[] = [
    {
      id: "inspection_type",
      title: "Type",
      options: [
        { value: "inbound", label: "Inbound" },
        { value: "outbound", label: "Outbound" },
      ],
    },
  ];

  return (
    <DataTable<Inspection>
      columns={columns}
      data={data}
      searchKey="product_serial"
      filters={filters}
    />
  );
}
