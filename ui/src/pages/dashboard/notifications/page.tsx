import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          View important alerts and updates from the inspection system.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <CardTitle>Notification center</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You do not have any notifications yet. New activity and alerts will
          appear here.
        </CardContent>
      </Card>
    </div>
  );
}

