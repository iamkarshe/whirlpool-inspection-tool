import { NotificationDetailDialog } from "@/components/app-notifications/notification-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PAGES } from "@/endpoints";
import { useAppNotifications } from "@/contexts/use-app-notifications";
import { formatDate } from "@/lib/core";
import type { AppNotification } from "@/services/app-notifications-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { BellIcon, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const Notifications = () => {
  const isMobile = useIsMobile();
  const { notifications, loading, unreadCount, markAsRead } =
    useAppNotifications();
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openNotification = (n: AppNotification) => {
    markAsRead(n.id);
    setSelected(n);
    setDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" className="relative">
            <BellIcon />
            {unreadCount > 0 ? (
              <span className="bg-destructive absolute end-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={isMobile ? "center" : "end"}
          className="ms-4 w-80 p-0"
        >
          <DropdownMenuLabel className="bg-background dark:bg-muted sticky top-0 z-10 p-0">
            <div className="flex justify-between border-b px-4 py-3">
              <div className="font-medium">Notifications</div>
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link to={PAGES.DASHBOARD_NOTIFICATIONS}>View all</Link>
              </Button>
            </div>
          </DropdownMenuLabel>

          <ScrollArea className="h-[min(350px,50vh)]">
            {loading ? (
              <div className="space-y-2 px-4 py-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-md bg-muted/60"
                  />
                ))}
              </div>
            ) : (
              notifications.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => openNotification(item)}
                  className="group flex cursor-pointer flex-col items-stretch gap-2 rounded-none border-b px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                        <Badge
                          variant={item.read ? "secondary" : "default"}
                          className="text-[10px] uppercase"
                        >
                          {item.read ? "Read" : "Unread"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                        {item.content}
                      </p>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatDate(item.createdAt)}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationDetailDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelected(null);
        }}
        notification={selected}
      />
    </>
  );
};

export default Notifications;
