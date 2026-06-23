import { RouterProvider } from "react-router-dom";

import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaNotificationPrompt } from "@/components/pwa-notification-prompt";
import { Toaster } from "@/components/ui/sonner";
import { AppTopBannersProvider } from "@/components/app-top-banners-provider";
import { GeolocationProvider } from "@/contexts/geolocation-provider";
import { router } from "./router";

function App() {
  return (
    <GeolocationProvider>
      <AppTopBannersProvider>
        <RouterProvider router={router} />
        <PwaInstallPrompt />
        <PwaNotificationPrompt />
        <Toaster />
      </AppTopBannersProvider>
    </GeolocationProvider>
  );
}

export default App;
