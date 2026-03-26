import { useContext } from "react";
import { AppNotificationsContext } from "@/contexts/app-notifications-context";

export function useAppNotifications() {
  const ctx = useContext(AppNotificationsContext);
  if (!ctx) {
    throw new Error(
      "useAppNotifications must be used within AppNotificationsProvider",
    );
  }
  return ctx;
}
