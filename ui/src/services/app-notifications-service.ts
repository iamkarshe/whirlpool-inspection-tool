/**
 * In-app notifications for the Whirlpool Inspection Tool dashboard.
 * Mock data until wired to the API.
 */

export type AppNotification = {
  id: string;
  title: string;
  content: string;
  read: boolean;
  /** ISO 8601 timestamp */
  createdAt: string;
};

const MOCK_NOTIFICATIONS: AppNotification[] = [];

export async function getAppNotifications(): Promise<AppNotification[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MOCK_NOTIFICATIONS]), 400);
  });
}
