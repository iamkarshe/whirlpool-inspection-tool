import { useState } from "react";

import { NotificationDetailDialog } from "@/components/app-notifications/notification-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableFilter } from "@/components/ui/data-table";
import { useAppNotifications } from "@/contexts/use-app-notifications";
import { formatCreatedAt } from "@/lib/core";
import type { AppNotification } from "@/services/app-notifications-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export default function NotificationsPage() {
  const { notifications, loading, markAsRead } = useAppNotifications();
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openNotification = (n: AppNotification) => {
    markAsRead(n.id);
    setSelected(n);
    setDialogOpen(true);
  };

  const columns: ColumnDef<AppNotification>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const n = row.original;
        return (
          <button
            type="button"
            onClick={() => openNotification(n)}
            className="min-w-0 max-w-[420px] truncate text-left font-medium text-foreground hover:underline"
            title={n.title}
          >
            {n.title}
          </button>
        );
      },
    },
    {
      accessorKey: "content",
      header: "Notification",
      cell: ({ row }) => (
        <div className="group relative max-w-[400px] overflow-hidden">
          <span className="text-muted-foreground line-clamp-1">
            {row.original.content}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background via-background/80 to-transparent group-hover:from-muted/50 group-hover:via-muted/30" />
        </div>
      ),
    },
    {
      accessorKey: "read",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.read ? "secondary" : "default"}>
          {row.original.read ? "Read" : "Unread"}
        </Badge>
      ),
      filterFn: (row, _columnId, filterValue) => {
        const v = row.original.read;
        if (filterValue === "read") return v === true;
        if (filterValue === "unread") return v === false;
        return true;
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          className="-ml-3"
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatCreatedAt(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <Button type="button" variant="outline" size="sm" onClick={() => openNotification(row.original)}>
          View
        </Button>
      ),
    },
  ];

  const filters: DataTableFilter<AppNotification>[] = [
    {
      id: "read",
      title: "Status",
      options: [
        { value: "unread", label: "Unread" },
        { value: "read", label: "Read" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="h-[220px] animate-pulse rounded-lg border bg-muted/40" />
      ) : (
        <DataTable<AppNotification>
          columns={columns}
          data={notifications}
          searchKey="title"
          filters={filters}
          dateRangeFilter={{ dateAccessorKey: "createdAt" }}
        />
      )}

      <NotificationDetailDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelected(null);
        }}
        notification={selected}
      />
    </div>
  );
}
