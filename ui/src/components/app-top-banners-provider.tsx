import { useEffect, useMemo, type ReactNode } from "react";

import { NetworkStatusBanner } from "@/components/network-status-banner";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { getAppTopBannerOffset } from "@/lib/app-environment";

export function AppTopBannersProvider({ children }: { children: ReactNode }) {
  const network = useNetworkStatus();

  const topBannerCount = useMemo(
    () => (network.bannerKind ? 1 : 0),
    [network.bannerKind],
  );

  useEffect(() => {
    const offset = getAppTopBannerOffset(topBannerCount);
    document.documentElement.style.setProperty("--app-top-banner-offset", offset);
    return () => {
      document.documentElement.style.removeProperty("--app-top-banner-offset");
    };
  }, [topBannerCount]);

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
