import { RouterProvider } from "react-router-dom";

import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaNotificationPrompt } from "@/components/pwa-notification-prompt";
import { Toaster } from "@/components/ui/sonner";
import { GeolocationProvider } from "@/contexts/geolocation-provider";
import { router } from "./router";

function App() {
  return (
    <GeolocationProvider>
      <RouterProvider router={router} />
      <PwaInstallPrompt />
      <PwaNotificationPrompt />
      <Toaster />
    </GeolocationProvider>
  );
}

export default App;
