import type { WarehouseUserResponse } from "@/api/generated/model/warehouseUserResponse";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import type { WarehouseViewContext } from "./context";

const columns: ColumnDef<WarehouseUserResponse>[] = [
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
  },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "mobile_number", header: "Mobile" },
  { accessorKey: "designation", header: "Designation" },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (row.original.is_active ? "Active" : "Inactive"),
  },
];

export default function WarehouseViewUsersPage() {
  const { users } = useOutletContext<WarehouseViewContext>();
  return <DataTable columns={columns} data={users} searchKey="name" rangeLabel="users" />;
}
