import type { WarehouseDeviceResponse } from "@/api/generated/model/warehouseDeviceResponse";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import type { WarehouseViewContext } from "./context";

const columns: ColumnDef<WarehouseDeviceResponse>[] = [
  {
    accessorKey: "uuid",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Device UUID
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.uuid}</span>,
  },
  { accessorKey: "user_name", header: "User" },
  { accessorKey: "imei", header: "IMEI" },
  { accessorKey: "device_type", header: "Type" },
  {
    accessorKey: "is_locked",
    header: "Locked",
    cell: ({ row }) => (row.original.is_locked ? "Yes" : "No"),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (row.original.is_active ? "Active" : "Inactive"),
  },
];

export default function WarehouseViewDevicesPage() {
  const { devices } = useOutletContext<WarehouseViewContext>();
  return <DataTable columns={columns} data={devices} searchKey="imei" rangeLabel="devices" />;
}
