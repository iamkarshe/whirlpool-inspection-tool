import { Network, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import VpnDevicesTable from "@/pages/dashboard/admin/vpn/vpn-devices-table";
import VpnPeersTable from "@/pages/dashboard/admin/vpn/vpn-peers-table";
import {
  fetchVpnProvisionDevices,
  fetchVpnWireguardPeers,
  vpnProvisionApiErrorMessage,
  type VpnProvisionDevice,
  type VpnWireguardPeer,
} from "@/services/vpn-provision-api";

type VpnTab = "peers" | "devices";

function tabFromParam(value: string | null): VpnTab {
  return value === "devices" ? "devices" : "peers";
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "ERR_CANCELED")
  );
}

export default function VpnAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFromParam(searchParams.get("tab"));

  const [peers, setPeers] = useState<VpnWireguardPeer[]>([]);
  const [devices, setDevices] = useState<VpnProvisionDevice[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [peersError, setPeersError] = useState<string | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const setTab = useCallback(
    (next: VpnTab) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === "peers") params.delete("tab");
          else params.set("tab", next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadPeers() {
      setLoadingPeers(true);
      setPeersError(null);
      try {
        const rows = await fetchVpnWireguardPeers({ signal });
        if (!signal.aborted) setPeers(rows);
      } catch (e: unknown) {
        if (!signal.aborted && !isAbortError(e)) {
          setPeersError(
            vpnProvisionApiErrorMessage(e, "Failed to load VPN peers."),
          );
        }
      } finally {
        if (!signal.aborted) setLoadingPeers(false);
      }
    }

    async function loadDevices() {
      setLoadingDevices(true);
      setDevicesError(null);
      try {
        const rows = await fetchVpnProvisionDevices({ signal });
        if (!signal.aborted) setDevices(rows);
      } catch (e: unknown) {
        if (!signal.aborted && !isAbortError(e)) {
          setDevicesError(
            vpnProvisionApiErrorMessage(e, "Failed to load VPN devices."),
          );
        }
      } finally {
        if (!signal.aborted) setLoadingDevices(false);
      }
    }

    if (tab === "peers") void loadPeers();
    else void loadDevices();

    return () => controller.abort();
  }, [tab, reloadKey]);

  const refresh = () => setReloadKey((v) => v + 1);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PageActionBar
          title="VPN"
          description="Live WireGuard peers and provisioned VPN devices."
        >
          <Button type="button" variant="outline" onClick={refresh}>
            Refresh
          </Button>
        </PageActionBar>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={tab}
          onValueChange={(value) => {
            if (value === "peers" || value === "devices") setTab(value);
          }}
          aria-label="VPN view"
        >
          <ToggleGroupItem value="peers" className="gap-1.5 px-3">
            <Network className="h-3.5 w-3.5" aria-hidden />
            Peers
          </ToggleGroupItem>
          <ToggleGroupItem value="devices" className="gap-1.5 px-3">
            <Server className="h-3.5 w-3.5" aria-hidden />
            Devices
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {tab === "peers" ?
        <>
          {peersError && !loadingPeers ?
            <p className="text-destructive text-sm">{peersError}</p>
          : null}
          <VpnPeersTable data={peers} isLoading={loadingPeers} />
        </>
      : <>
          {devicesError && !loadingDevices ?
            <p className="text-destructive text-sm">{devicesError}</p>
          : null}
          <VpnDevicesTable data={devices} isLoading={loadingDevices} />
        </>
      }
    </div>
  );
}
