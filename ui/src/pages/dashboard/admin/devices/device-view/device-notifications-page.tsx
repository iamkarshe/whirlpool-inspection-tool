import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import SkeletonTable from "@/components/skeleton7";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import type { DeviceNotification } from "./notification-service";
import {
  getNotificationsByDeviceId,
  sendNotificationToDevice,
  type SendDeviceNotificationPayload,
} from "./notification-service";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { toast } from "sonner";

type DeviceViewContext = { device: Device };

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const columns: ColumnDef<DeviceNotification>[] = [
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
    cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => (
      <span className="max-w-[320px] truncate" title={row.original.message}>
        {row.original.message}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="secondary">
        {row.original.type === "inspection" ? "Inspection" : "System"}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      if (status === "sent") return <Badge variant="success">Sent</Badge>;
      if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
      return <Badge variant="secondary">Queued</Badge>;
    },
  },
  {
    accessorKey: "sent_at",
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
      <span className="font-mono text-xs">{formatDateTime(row.original.sent_at)}</span>
    ),
  },
];

export default function DeviceNotificationsPage() {
  const { device } = useOutletContext<DeviceViewContext>();
  const [notifications, setNotifications] = useState<DeviceNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [formValues, setFormValues] = useState<SendDeviceNotificationPayload>({
    title: "",
    message: "",
    type: "inspection",
  });

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    getNotificationsByDeviceId(device.id)
      .then((data) => {
        if (!cancelled) setNotifications(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [device.id]);

  const resetForm = () => {
    setFormValues({ title: "", message: "", type: "inspection" });
  };

  const handleSend = async () => {
    const payload = {
      title: formValues.title.trim(),
      message: formValues.message.trim(),
      type: formValues.type ?? "inspection",
    };

    if (!payload.title || !payload.message) return;

    try {
      setSending(true);
      const created = await sendNotificationToDevice(device.id, payload);
      setNotifications((prev) => [created, ...prev]);
      resetForm();
      setOpen(false);
    } catch {
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <SkeletonTable />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3">
        <Dialog open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Send New Notification
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send notification</DialogTitle>
              <DialogDescription>
                This will send a PWA notification to the selected device.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notif-title">Title</Label>
                <Input
                  id="notif-title"
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Inspection reminder"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notif-message">Message</Label>
                <Textarea
                  id="notif-message"
                  rows={4}
                  value={formValues.message}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      message: event.target.value,
                    }))
                  }
                  placeholder="What should the operator see?"
                  required
                />
              </div>
            </div>

            <DialogFooter className="mt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSend()} disabled={sending}>
                {sending ? "Sending..." : "Send notification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable<DeviceNotification>
        columns={columns}
        data={notifications}
        searchKey="title"
        dateRangeFilter={{ dateAccessorKey: "sent_at" }}
        rangeLabel="notifications"
      />
    </div>
  );
}

