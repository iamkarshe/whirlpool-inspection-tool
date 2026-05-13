import { Globe, Smartphone, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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

const RELEASE_CODE = `v${import.meta.env.VITE_APP_BUILD}`;
const LAST_UPDATED = "2026-03-05";
let clientIpCache: string | null = null;
let clientIpRequest: Promise<string> | null = null;

function fetchClientIpOnce(): Promise<string> {
  if (clientIpCache) return Promise.resolve(clientIpCache);
  if (!clientIpRequest) {
    clientIpRequest = fetch("https://api.ipify.org?format=json")
      .then((res) => res.json() as Promise<{ ip: string }>)
      .then((data) => {
        clientIpCache = data.ip;
        return data.ip;
      })
      .catch(() => {
        clientIpCache = "—";
        return "—";
      });
  }
  return clientIpRequest;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile, isMobile } = useSidebar();
  const [clientIp, setClientIp] = useState<string | null>(null);
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
    void fetchClientIpOnce().then((ip) => {
      if (!cancelled) setClientIp(ip);
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
      network: {
        ip: clientIp,
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
  }, [clientIp, deviceFingerprint]);

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
              <span className="inline-flex min-w-0 items-center rounded-md bg-emerald-500/10 px-2 py-0.5 o text-foreground leading-none">
                {RELEASE_CODE}
              </span>
            </Link>

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
                className="max-w-[120px] overflow-hidden whitespace-nowrap rounded-md bg-amber-500/10 px-2 py-0.5 o text-foreground leading-none"
                title={clientIp ?? "—"}
              >
                {clientIp ?? "—"}
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
