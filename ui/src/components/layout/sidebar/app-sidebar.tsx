import { Globe, Network, Server, Smartphone, Tag } from "lucide-react";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { VersionResponse } from "@/api/generated/model/versionResponse";
import { BrandLogo } from "@/components/brand-logo";
import { CopyDebugDetailsDialog } from "@/components/dialog-copy-debug-details";
import { NavMain } from "@/components/layout/sidebar/nav-main";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { PAGES } from "@/endpoints";
import { getOrCreatePersistentDeviceId } from "@/lib/device-fingerprint";
import { fetchAppVersion } from "@/services/app-version";

const RELEASE_CODE = `v${import.meta.env.VITE_APP_BUILD}`;
const LAST_UPDATED = "2026-03-05";

function formatSidebarValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "—";
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { setOpenMobile, isMobile } = useSidebar();
  const [versionInfo, setVersionInfo] = useState<VersionResponse | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      try {
        return getOrCreatePersistentDeviceId();
      } catch {
        return window.localStorage.getItem("whirlpool.deviceFingerprint");
      }
    },
  );
  const [deviceDebugOpen, setDeviceDebugOpen] = useState(false);

  // COMBAK
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  useEffect(() => {
    let cancelled = false;
    void fetchAppVersion()
      .then((version) => {
        if (!cancelled) setVersionInfo(version);
      })
      .catch(() => {
        if (!cancelled) setVersionInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || deviceFingerprint) return;
    const rafId = window.requestAnimationFrame(() => {
      try {
        setDeviceFingerprint(getOrCreatePersistentDeviceId());
      } catch {
        setDeviceFingerprint(null);
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [deviceFingerprint]);

  const deviceDebugText = useMemo(() => {
    if (typeof window === "undefined") return "";

    const payload = {
      appBuild: import.meta.env.VITE_APP_BUILD,
      release: RELEASE_CODE,
      lastUpdated: LAST_UPDATED,
      device: {
        fingerprint: deviceFingerprint,
      },
      api: {
        version: versionInfo?.version ?? null,
        public_ip_address: versionInfo?.public_ip_address ?? null,
        vpn_server: versionInfo?.vpn_server ?? null,
        can_access_app: versionInfo?.can_access_app ?? null,
      },
      network: {
        online: navigator.onLine,
        userAgent: navigator.userAgent,
        language: navigator.language,
      },
      context: {
        origin: window.location.origin,
        timestamp: new Date().toISOString(),
      },
    };

    return JSON.stringify(payload, null, 2);
  }, [deviceFingerprint, versionInfo]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:text-foreground h-10 group-data-[collapsible=icon]:px-0!">
                  <div className="flex items-center text-foreground font-semibold text-xl">
                    <BrandLogo />
                    <span className="-ml-4">Insights</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <NavMain />
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <div className="bg-muted mt-1 rounded-md border group-data-[collapsible=icon]:hidden transition-none">
          <div className="space-y-1.5 p-2">
            <h4 className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wider">
              System
            </h4>
            <Link
              to={PAGES.DASHBOARD_RELEASE_NOTES}
              className="flex items-center justify-between gap-2 rounded-md py-1 text-[11px] hover:bg-muted/60"
            >
              <span className="text-muted-foreground flex items-center gap-1.5 leading-none">
                <Tag className="h-3.5 w-3.5 shrink-0" />
                Release
              </span>
              <span className="inline-flex min-w-0 items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-foreground leading-none">
                {RELEASE_CODE}
              </span>
            </Link>

            <div className="flex items-center justify-between gap-2 rounded-md py-1 text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1.5 leading-none">
                <Server className="h-3.5 w-3.5 shrink-0" />
                API
              </span>
              <span
                className="max-w-[120px] overflow-hidden whitespace-nowrap rounded-md bg-sky-500/10 px-2 py-0.5 text-foreground leading-none"
                title={formatSidebarValue(versionInfo?.version)}
              >
                {formatSidebarValue(versionInfo?.version)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDeviceDebugOpen(true)}
              className="flex w-full items-center justify-between gap-2 rounded-md py-1 text-left text-[11px] hover:bg-muted/60"
            >
              <span className="text-muted-foreground flex items-center gap-1.5 leading-none">
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                DeviceID
              </span>
              <span
                className="max-w-[120px] overflow-hidden whitespace-nowrap rounded-md bg-violet-500/10 px-2 py-0.5 text-foreground leading-none"
                title={deviceFingerprint ?? "—"}
              >
                {deviceFingerprint ?? "—"}
              </span>
            </button>

            <div className="flex items-center justify-between gap-2 rounded-md py-1 text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1.5 leading-none">
                <Globe className="h-3.5 w-3.5 shrink-0" />
                IP Address
              </span>
              <span
                className="max-w-[120px] overflow-hidden whitespace-nowrap rounded-md bg-amber-500/10 px-2 py-0.5 text-foreground leading-none"
                title={formatSidebarValue(versionInfo?.public_ip_address)}
              >
                {formatSidebarValue(versionInfo?.public_ip_address)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md py-1 text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1.5 leading-none">
                <Network className="h-3.5 w-3.5 shrink-0" />
                VPN Server
              </span>
              <span
                className="max-w-[120px] overflow-hidden whitespace-nowrap rounded-md bg-indigo-500/10 px-2 py-0.5 text-foreground leading-none"
                title={formatSidebarValue(versionInfo?.vpn_server)}
              >
                {formatSidebarValue(versionInfo?.vpn_server)}
              </span>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <CopyDebugDetailsDialog
        open={deviceDebugOpen}
        onOpenChange={setDeviceDebugOpen}
        title="Device debug details"
        description="Copy these details and send them to developers for investigation."
        debugText={deviceDebugText}
      />
    </Sidebar>
  );
}
