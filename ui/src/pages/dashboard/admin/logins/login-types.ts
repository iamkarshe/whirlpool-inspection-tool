export interface LoginActivity {
  id: number;
  uuid: string;
  reference_id: string;
  user_name: string;
  email: string;
  logged_at: string;
  ip_address: string;
  device_info: string;
  status: string;
  success: boolean;
  user_agent?: string | null;
}

export interface LoginKpis {
  totalLogins: number;
  totalChange: string;
  totalChangeType: "positive" | "negative";
  successfulLogins: number;
  successChange: string;
  successChangeType: "positive" | "negative";
  failedLogins: number;
  failedChange: string;
  failedChangeType: "positive" | "negative";
  uniqueUsers: number;
  usersChange: string;
  usersChangeType: "positive" | "negative";
}
