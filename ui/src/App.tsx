import { GeolocationProvider } from "@/contexts/geolocation-provider";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

function App() {
  return (
    <GeolocationProvider>
      <RouterProvider router={router} />
    </GeolocationProvider>
  );
}

export default App;
