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

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: "ntf-001",
    title: "Batch inspection synced",
    content:
      "Warehouse WH-MUM-01 completed 48 inspections in the last sync window. All records were pushed to the central server without errors. You can review the batch summary under Reports → Daily inspections.",
    read: false,
    createdAt: "2025-03-25T09:14:00.000Z",
  },
  {
    id: "ntf-002",
    title: "Device offline: handheld #12",
    content:
      "The mobile device registered as Galaxy A54 (IMEI ending 678) has not checked in for over 2 hours. Ask the operator to reconnect to Wi‑Fi or mark the device offline in Admin → Devices if it left the floor.",
    read: false,
    createdAt: "2025-03-25T08:02:00.000Z",
  },
  {
    id: "ntf-003",
    title: "Checklist update for refrigerators",
    content:
      "Product category “Double Door Refrigerators” has an updated packing checklist (v2.3). New pass/fail rules apply from tomorrow. Supervisors should brief operators during the shift handover.",
    read: true,
    createdAt: "2025-03-24T16:30:00.000Z",
  },
  {
    id: "ntf-004",
    title: "Inspection flagged for review",
    content:
      "Inspection INS-2025-03182 was marked with critical packaging damage. Quality has been notified. Open the inspection detail to add notes or close the case after rework.",
    read: false,
    createdAt: "2025-03-24T11:45:00.000Z",
  },
  {
    id: "ntf-005",
    title: "Weekly operations summary ready",
    content:
      "Your weekly operations analytics export is ready. Inwards vs outwards volume, fault trends, and top warehouses are included. Download from Reports → Operations analytics when convenient.",
    read: true,
    createdAt: "2025-03-23T07:00:00.000Z",
  },
];

export async function getAppNotifications(): Promise<AppNotification[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...MOCK_NOTIFICATIONS]), 400);
  });
}
