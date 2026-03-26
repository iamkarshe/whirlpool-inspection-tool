import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import SkeletonTable from "@/components/skeleton7";
import { formatDate } from "@/lib/core";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import type { DeviceLockHistoryEvent } from "./lock-history-service";
import { getDeviceLockHistoryByDeviceId } from "./lock-history-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type DeviceViewContext = { device: Device };

const columns: ColumnDef<DeviceLockHistoryEvent>[] = [
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => {
      const action = row.original.action;
      return action === "lock" ? (
        <Badge variant="warning">Locked</Badge>
      ) : (
        <Badge variant="success">Unlocked</Badge>
      );
    },
  },
  {
    accessorKey: "actor_name",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Actor
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => row.original.actor_name,
  },
  {
    accessorKey: "occurred_at",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Time
        <ArrowUpDown className="ml-1 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs">{formatDate(row.original.occurred_at)}</span>
    ),
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <span className="max-w-[260px] truncate" title={row.original.reason ?? "—"}>
        {row.original.reason ?? "—"}
      </span>
    ),
  },
];

export default function DeviceViewLockHistoryPage() {
  const { device } = useOutletContext<DeviceViewContext>();
  const [events, setEvents] = useState<DeviceLockHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    getDeviceLockHistoryByDeviceId(device.id)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [device.id]);

  if (loading) return <SkeletonTable />;

  return (
    <DataTable<DeviceLockHistoryEvent>
      columns={columns}
      data={events}
      searchKey="actor_name"
      dateRangeFilter={{ dateAccessorKey: "occurred_at" }}
      rangeLabel="lock events"
    />
  );
}

