import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { getDevices } from "@/pages/dashboard/admin/devices/device-service";

export interface LiveDevicesKpis {
  totalDevices: number;
  totalChange: string;
  totalChangeType: "positive" | "negative";
  activeDevices: number;
  activeChange: string;
  activeChangeType: "positive" | "negative";
  mobileDevices: number;
  mobileChange: string;
  mobileChangeType: "positive" | "negative";
  desktopDevices: number;
  desktopChange: string;
  desktopChangeType: "positive" | "negative";
}

export async function getLiveDevicesKpis(): Promise<LiveDevicesKpis> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        totalDevices: 48,
        totalChange: "+6.7%",
        totalChangeType: "positive",
        activeDevices: 42,
        activeChange: "+8.2%",
        activeChangeType: "positive",
        mobileDevices: 35,
        mobileChange: "+5.1%",
        mobileChangeType: "positive",
        desktopDevices: 13,
        desktopChange: "+11.2%",
        desktopChangeType: "positive",
      });
    }, 400);
  });
}

export async function getLiveDevicesReport(): Promise<Device[]> {
  return getDevices();
}
