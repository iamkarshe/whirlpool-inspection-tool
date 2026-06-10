import type { LoginIpExternalLinksResponse } from "@/api/generated/model/loginIpExternalLinksResponse";
import type { LoginIpMetadataResponse } from "@/api/generated/model/loginIpMetadataResponse";
import type { LoginIpSummaryItemResponse } from "@/api/generated/model/loginIpSummaryItemResponse";

export interface LoginActivity {
  id: number;
  uuid: string;
  reference_id: string;
  user_name: string;
  email: string;
  attempted_email?: string | null;
  login_method?: string | null;
  failure_reason?: string | null;
  logged_at: string;
  ip_address: string;
  proxy_ip_address?: string | null;
  ip_metadata?: LoginIpMetadataResponse | null;
  external_links?: LoginIpExternalLinksResponse | null;
  device_info: string;
  status: string;
  success: boolean;
  user_agent?: string | null;
}

export type LoginIpSummaryRow = LoginIpSummaryItemResponse;

export type LoginKpiFilter = "" | "successful" | "failed";

export interface LoginKpis {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
}
