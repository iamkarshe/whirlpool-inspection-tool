import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Building2, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGES } from "@/endpoints";
import type { Warehouse } from "./warehouse-service";

const warehouseColumns: ColumnDef<Warehouse>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Warehouse ID
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        to={PAGES.warehouseViewPath(row.original.id)}
        className="inline-block"
      >
        <Badge
          variant="secondary"
          className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-sm transition-colors hover:bg-primary/15 hover:text-primary"
        >
          <Building2 className="h-3.5 w-3.5" />
          {row.getValue("id")}
        </Badge>
      </Link>
    ),
  },
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
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseViewPath(id)}>View warehouse</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseUsersPath(id)}>View users</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={PAGES.warehouseDevicesPath(id)}>View devices</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
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
