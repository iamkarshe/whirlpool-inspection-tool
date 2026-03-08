import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-service";
import { getLogins } from "@/pages/dashboard/admin/logins/login-service";

export interface DailyLoginKpis {
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

export async function getDailyLoginKpis(
  _dateFrom?: string,
  _dateTo?: string,
): Promise<DailyLoginKpis> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalLogins: 342,
        totalChange: "+18.2%",
        totalChangeType: "positive",
        successfulLogins: 328,
        successChange: "+19.1%",
        successChangeType: "positive",
        failedLogins: 14,
        failedChange: "-5.2%",
        failedChangeType: "positive",
        uniqueUsers: 24,
        usersChange: "+3",
        usersChangeType: "positive",
      });
    }, 400);
  });
}

export async function getDailyLoginReport(
  _dateFrom?: string,
  _dateTo?: string,
): Promise<LoginActivity[]> {
  return getLogins();
}
