import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { Badge, BADGE_ICON_CLASS } from "@/components/ui/badge";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import type { VpnProvisionDevice } from "@/services/vpn-provision-api";
import { CheckCircle, XCircle } from "lucide-react";

const columns: ColumnDef<VpnProvisionDevice>[] = [
  {
    accessorKey: "user_name",
    header: "User",
    cell: ({ row }) => row.getValue("user_name"),
  },
  {
    accessorKey: "user_email",
    header: "Email",
    cell: ({ row }) => row.getValue("user_email"),
  },
  {
    accessorKey: "device_name",
    header: "Device",
    cell: ({ row }) => row.getValue("device_name"),
  },
  {
    accessorKey: "device_type",
    header: "Type",
    cell: ({ row }) => row.original.device_type?.trim() || "—",
  },
  {
    accessorKey: "assigned_ip",
    header: "VPN IP",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue("assigned_ip")}</span>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const active = row.original.is_active;
      const Icon = active ? CheckCircle : XCircle;
      return (
        <Badge
          variant={active ? "success" : "destructive"}
          className={BADGE_ICON_CLASS}
        >
          <Icon />
          {active ? "ACTIVE" : "REVOKED"}
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
    accessorKey: "uuid",
    header: "Device UUID",
    cell: ({ row }) => {
      const uuid = String(row.getValue("uuid") ?? "");
      const short =
        uuid.length > 24 ? `${uuid.slice(0, 8)}…${uuid.slice(-8)}` : uuid;
      return (
        <span className="font-mono text-xs" title={uuid}>
          {short}
        </span>
      );
    },
  },
];

const deviceFilters: DataTableFilter<VpnProvisionDevice>[] = [
  {
    id: "is_active",
    title: "Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Revoked" },
    ],
  },
];

interface VpnDevicesTableProps {
  data: VpnProvisionDevice[];
  isLoading?: boolean;
}

export default function VpnDevicesTable({
  data,
  isLoading,
}: VpnDevicesTableProps) {
  const memoColumns = useMemo(() => columns, []);

  return (
    <DataTable<VpnProvisionDevice>
      columns={memoColumns}
      data={data}
      filters={deviceFilters}
      rangeLabel="devices"
      isLoading={isLoading}
    />
  );
}
