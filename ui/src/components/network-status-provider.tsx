import { useEffect, type ReactNode } from "react";

import { NetworkStatusBanner } from "@/components/network-status-banner";
import { useNetworkStatus } from "@/hooks/use-network-status";

const BANNER_OFFSET = "2.75rem";

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const network = useNetworkStatus();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--network-status-banner-offset",
      network.bannerKind ? BANNER_OFFSET : "0px",
    );
    return () => {
      document.documentElement.style.removeProperty(
        "--network-status-banner-offset",
      );
    };
  }, [network.bannerKind]);

  return (
    <>
      {network.bannerKind ? (
        <div className="fixed inset-x-0 top-0 z-[90]">
          <NetworkStatusBanner
            kind={network.bannerKind}
            lastRttMs={network.lastRttMs}
            healthChecking={network.healthChecking}
            onDismiss={
              network.bannerKind === "slow"
                ? network.dismissSlowBanner
                : undefined
            }
            onRecheck={() => void network.recheck()}
          />
        </div>
      ) : null}
      {children}
    </>
  );
}
