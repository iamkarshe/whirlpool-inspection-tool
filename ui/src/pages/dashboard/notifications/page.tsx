import { Bell, Clock } from "lucide-react";
import { useState } from "react";

import { NotificationDetailDialog } from "@/components/app-notifications/notification-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppNotifications } from "@/contexts/use-app-notifications";
import { formatCreatedAt } from "@/lib/core";
import type { AppNotification } from "@/services/app-notifications-service";

export default function NotificationsPage() {
  const { notifications, loading, markAsRead } = useAppNotifications();
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openNotification = (n: AppNotification) => {
    markAsRead(n.id);
    setSelected(n);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <Bell className="h-4 w-4 text-primary" />
          <div>
            <CardTitle>Notification center</CardTitle>
            <CardDescription>
              Select a notification to read the full message.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 px-6 py-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-muted/60"
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className="flex w-full flex-col gap-2 px-6 py-4 text-left transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{n.title}</span>
                        <Badge variant={n.read ? "secondary" : "default"}>
                          {n.read ? "Read" : "Unread"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {n.content}
                      </p>
                    </div>
                    <div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs sm:pl-4">
                      <Clock className="h-3.5 w-3.5" />
                      {formatCreatedAt(n.createdAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
