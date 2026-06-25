import { RouterProvider } from "react-router-dom";
import { useEffect } from "react";

import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaNotificationPrompt } from "@/components/pwa-notification-prompt";
import { Toaster } from "@/components/ui/sonner";
import { NetworkStatusProvider } from "@/components/network-status-provider";
import { GeolocationProvider } from "@/contexts/geolocation-provider";
import { hideAppBootLoader } from "@/lib/app-boot-loader";
import { router } from "./router";

function App() {
  useEffect(() => {
    hideAppBootLoader();
  }, []);

  return (
    <GeolocationProvider>
      <NetworkStatusProvider>
        <RouterProvider router={router} />
        <PwaInstallPrompt />
        <PwaNotificationPrompt />
        <Toaster />
      </NetworkStatusProvider>
    </GeolocationProvider>
  );
}

export default App;
