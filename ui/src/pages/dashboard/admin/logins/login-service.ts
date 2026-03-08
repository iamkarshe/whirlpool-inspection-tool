/**
 * Login activity / audit log. Aligned with backend: user, logged_at, ip, device/session info.
 */
export interface LoginActivity {
  id: string;
  user_id: number;
  user_name: string;
  email: string;
  logged_at: string;
  ip_address: string;
  device_info?: string;
  user_agent?: string;
  success: boolean;
}

export const loginActivities: LoginActivity[] = [
  {
    id: "log-001",
    user_id: 1,
    user_name: "Amit Sharma",
    email: "amit.sharma@whirlpool.com",
    logged_at: "2024-03-05T09:12:00Z",
    ip_address: "192.168.1.101",
    device_info: "Chrome 120, Windows 11",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    success: true,
  },
  {
    id: "log-002",
    user_id: 2,
    user_name: "Priya Verma",
    email: "priya.verma@whirlpool.com",
    logged_at: "2024-03-05T08:45:00Z",
    ip_address: "192.168.1.102",
    device_info: "Android 14, Samsung Galaxy",
    user_agent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
    success: true,
  },
  {
    id: "log-003",
    user_id: 1,
    user_name: "Amit Sharma",
    email: "amit.sharma@whirlpool.com",
    logged_at: "2024-03-04T17:30:00Z",
    ip_address: "192.168.1.101",
    device_info: "Chrome 120, Windows 11",
    success: true,
  },
  {
    id: "log-004",
    user_id: 3,
    user_name: "Rahul Gupta",
    email: "rahul.gupta@whirlpool.com",
    logged_at: "2024-03-04T14:22:00Z",
    ip_address: "10.0.0.55",
    device_info: "Safari 17, macOS",
    success: true,
  },
  {
    id: "log-005",
    user_id: 0,
    user_name: "—",
    email: "unknown@example.com",
    logged_at: "2024-03-04T11:05:00Z",
    ip_address: "203.0.113.42",
    device_info: "Unknown",
    success: false,
  },
];

export const getLogins = async (): Promise<LoginActivity[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...loginActivities]);
    }, 1000);
  });
};
