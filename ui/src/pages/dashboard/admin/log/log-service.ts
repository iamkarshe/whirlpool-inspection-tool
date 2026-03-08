/**
 * Application / audit log entry.
 */
export interface Log {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  source: string;
  timestamp: string;
  user_id?: number;
  user_name?: string;
  details?: string;
}

export const logs: Log[] = [
  {
    id: "log-1",
    level: "info",
    message: "User login successful",
    source: "auth",
    timestamp: "2024-03-05T10:15:00Z",
    user_id: 1,
    user_name: "Amit Sharma",
    details: '{"ip":"192.168.1.101","device":"Chrome 120"}',
  },
  {
    id: "log-2",
    level: "warn",
    message: "High memory usage on device",
    source: "devices",
    timestamp: "2024-03-05T09:42:00Z",
    details: '{"device_id":"dev-002","usage_percent":92}',
  },
  {
    id: "log-3",
    level: "error",
    message: "Inspection sync failed",
    source: "inspections",
    timestamp: "2024-03-05T09:10:00Z",
    user_id: 2,
    user_name: "Priya Verma",
    details: '{"inspection_id":"insp-101","error":"Connection timeout"}',
  },
  {
    id: "log-4",
    level: "info",
    message: "Warehouse config updated",
    source: "masters",
    timestamp: "2024-03-05T08:30:00Z",
    user_id: 3,
    user_name: "Rahul Gupta",
    details: '{"warehouse_id":"wh-1","fields":["capacity"]}',
  },
  {
    id: "log-5",
    level: "info",
    message: "Export completed",
    source: "reports",
    timestamp: "2024-03-05T08:00:00Z",
    user_id: 1,
    user_name: "Amit Sharma",
    details: '{"report":"daily-inspections","rows":150}',
  },
  {
    id: "log-6",
    level: "warn",
    message: "Multiple failed login attempts",
    source: "auth",
    timestamp: "2024-03-04T17:55:00Z",
    details: '{"ip":"203.0.113.42","attempts":5}',
  },
  {
    id: "log-7",
    level: "error",
    message: "S3 upload failed",
    source: "storage",
    timestamp: "2024-03-04T16:20:00Z",
    details: '{"bucket":"attachments","key":"insp/101/photo.jpg","code":"AccessDenied"}',
  },
  {
    id: "log-8",
    level: "info",
    message: "Device registered",
    source: "devices",
    timestamp: "2024-03-04T14:00:00Z",
    user_id: 2,
    user_name: "Priya Verma",
    details: '{"device_id":"dev-003","model":"Scanner Pro"}',
  },
];

export const getLogs = async (): Promise<Log[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([...logs]), 600);
  });
};

export const getLogById = async (id: string): Promise<Log | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const log = logs.find((l) => l.id === id) ?? null;
      resolve(log);
    }, 400);
  });
};
