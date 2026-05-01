import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { PAGES } from "@/endpoints";
import { Badge } from "@/components/ui/badge";
import type {
  Device,
  DeviceUserAssignment,
} from "@/pages/dashboard/admin/devices/device-service";
import { getDeviceUsers } from "@/pages/dashboard/admin/devices/device-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/core";

type DeviceViewContext = { device: Device };

const columns: ColumnDef<DeviceUserAssignment>[] = [
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
    cell: ({ row }) => {
      const uuid = row.original.user_uuid?.trim();
      const name = row.original.user_name;
      if (!uuid) {
        return <span className="font-medium">{name}</span>;
      }
      return (
        <Link
          to={PAGES.userViewPath(uuid)}
          className="text-primary hover:underline font-medium"
        >
          {name}
        </Link>
      );
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Email
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => row.original.role || "—",
  },
  {
    accessorKey: "assigned_at",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Assigned at
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {formatDate(row.original.assigned_at)}
      </span>
    ),
  },
  {
    accessorKey: "unassigned_at",
    header: "Unassigned at",
    cell: ({ row }) => {
      const v = row.original.unassigned_at;
      return v ? (
        <span className="font-mono text-xs">{formatDate(v)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "is_current",
    header: "Status",
    cell: ({ row }) =>
      row.original.is_current ? (
        <Badge variant="default" className="text-xs">
          Current
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-xs">
          Previous
        </Badge>
      ),
    filterFn: (row, _columnId, filterValue) => {
      if (filterValue === "current") return row.original.is_current === true;
      if (filterValue === "previous") return row.original.is_current === false;
      return true;
    },
  },
];

const filters: DataTableFilter<DeviceUserAssignment>[] = [
  {
    id: "is_current",
    title: "Status",
    options: [
      { value: "current", label: "Current" },
      { value: "previous", label: "Previous" },
    ],
  },
];

export default function DeviceViewUsersPage() {
  const { device } = useOutletContext<DeviceViewContext>();
  const [users, setUsers] = useState<DeviceUserAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDeviceUsers(device.id)
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [device.id]);

  if (loading) {
    return <SkeletonTable />;
  }

  return (
    <DataTable<DeviceUserAssignment>
      columns={columns}
      data={users}
      searchKey="user_name"
      filters={filters}
      dateRangeFilter={{ dateAccessorKey: "assigned_at" }}
      rangeLabel="device users"
    />
  );
}
