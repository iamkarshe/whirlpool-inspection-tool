import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Warehouse } from "./warehouse-service";

const warehouseColumns: ColumnDef<Warehouse>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.getValue("name"),
  },
  {
    accessorKey: "warehouse_code",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Code
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs uppercase">
        {row.getValue("warehouse_code")}
      </span>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => (
      <span className="text-muted-foreground max-w-[200px] truncate">
        {row.getValue("address")}
      </span>
    ),
  },
  {
    id: "coordinates",
    header: "Coordinates",
    cell: ({ row }) => {
      const { lat, lng } = row.original;
      if (lat == null || lng == null) return "—";
      return (
        <span className="font-mono text-xs">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      );
    },
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
          <DropdownMenuItem>View warehouse</DropdownMenuItem>
          <DropdownMenuItem>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

interface WarehousesDataTableProps {
  data: Warehouse[];
}

export default function WarehousesDataTable({
  data,
}: WarehousesDataTableProps) {
  return (
    <DataTable<Warehouse>
      columns={warehouseColumns}
      data={data}
      searchKey="name"
    />
  );
}
