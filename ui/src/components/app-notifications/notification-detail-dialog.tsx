import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AppNotification } from "@/services/app-notifications-service";

export type NotificationDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: AppNotification | null;
};

export function NotificationDetailDialog({
  open,
  onOpenChange,
  notification,
}: NotificationDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{notification?.title ?? ""}</DialogTitle>
        </DialogHeader>
        {notification ? (
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border bg-muted/30 px-3 py-3 text-sm leading-relaxed text-foreground">
            {notification.content}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
