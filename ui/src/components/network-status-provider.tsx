import { createContext, useContext, type ReactNode } from "react";

import { NetworkStatusDialog } from "@/components/network-status-dialog";
import {
  useNetworkStatus,
  type NetworkStatusState,
} from "@/hooks/use-network-status";

const NetworkStatusContext = createContext<NetworkStatusState | null>(null);

export function useNetworkStatusContext(): NetworkStatusState {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error(
      "useNetworkStatusContext must be used within NetworkStatusProvider",
    );
  }
  return context;
}

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const network = useNetworkStatus();

  return (
    <NetworkStatusContext.Provider value={network}>
      <NetworkStatusDialog
        kind={network.connectivityIssue}
        healthChecking={network.healthChecking}
        onRecheck={network.recheck}
      />
      {children}
    </NetworkStatusContext.Provider>
  );
}
