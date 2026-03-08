import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DialogDeleteDevice from "@/pages/dashboard/admin/devices/dialog-delete-device";
import DialogLockDevice from "@/pages/dashboard/admin/devices/dialog-lock-device";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Smartphone } from "lucide-react";
import { useState } from "react";

function buildDeviceColumns(
  onLockClick: (device: Device) => void,
  onDeleteClick: (device: Device) => void,
): ColumnDef<Device>[] {
  return [
    {
      accessorKey: "user_name",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          User
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => row.getValue("user_name"),
    },
    {
      accessorKey: "imei",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          IMEI
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("imei")}</span>
      ),
    },
    {
      accessorKey: "device_type",
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
        const type = row.original.device_type;
        return (
          <span className="inline-flex items-center gap-1 capitalize">
            <Smartphone className="h-3.5 w-3.5" />
            {type}
          </span>
        );
      },
    },
    {
      accessorKey: "device_fingerprint",
      header: "Fingerprint",
      cell: ({ row }) => (
        <span className="max-w-[140px] truncate font-mono text-xs text-muted-foreground">
          {row.getValue("device_fingerprint")}
        </span>
      ),
    },
    {
      accessorKey: "is_locked",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Locked
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const locked = row.original.is_locked;
        return (
          <Badge variant={locked ? "destructive" : "secondary"}>
            {locked ? "Locked" : "Unlocked"}
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue) => {
        const v = row.getValue("is_locked") as boolean;
        if (filterValue === "true") return v === true;
        if (filterValue === "false") return v === false;
        return true;
      },
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <Badge variant={active ? "success" : "destructive"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
      filterFn: (row, _columnId, filterValue) => {
        const v = row.getValue("is_active") as boolean;
        if (filterValue === "true") return v === true;
        if (filterValue === "false") return v === false;
        return true;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View device</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onLockClick(row.original)}>
            Lock device
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDeleteClick(row.original)}>
            Delete device
          </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

const deviceFilters: DataTableFilter<Device>[] = [
  {
    id: "is_active",
    title: "Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
  {
    id: "device_type",
    title: "Type",
    options: [
      { value: "desktop", label: "Desktop" },
      { value: "mobile", label: "Mobile" },
    ],
  },
  {
    id: "is_locked",
    title: "Locked",
    options: [
      { value: "true", label: "Locked" },
      { value: "false", label: "Unlocked" },
    ],
  },
];

interface DevicesDataTableProps {
  data: Device[];
}

export default function DevicesDataTable({ data }: DevicesDataTableProps) {
  const [deviceToLock, setDeviceToLock] = useState<Device | null>(null);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  const deviceColumns = buildDeviceColumns(
    (device) => setDeviceToLock(device),
    (device) => setDeviceToDelete(device),
  );

  return (
    <>
      <DataTable<Device>
        columns={deviceColumns}
        data={data}
        searchKey="user_name"
        filters={deviceFilters}
      />
      <DialogLockDevice
        open={deviceToLock !== null}
        onOpenChange={(open) => {
          if (!open) setDeviceToLock(null);
        }}
        device={deviceToLock}
        onConfirm={(device) => {
          // TODO: wire lock device API
          console.log("Lock device", device);
        }}
      />
      <DialogDeleteDevice
        open={deviceToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setDeviceToDelete(null);
        }}
        device={deviceToDelete}
        onConfirm={(device) => {
          // TODO: wire delete device API
          console.log("Delete device", device);
        }}
      />
    </>
  );
}
