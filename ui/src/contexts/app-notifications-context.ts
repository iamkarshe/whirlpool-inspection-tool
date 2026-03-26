import type { AppNotification } from "@/services/app-notifications-service";
import { createContext } from "react";

export type AppNotificationsContextValue = {
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
  markAsRead: (id: string) => void;
};

export const AppNotificationsContext = createContext<
  AppNotificationsContextValue | undefined
>(undefined);
