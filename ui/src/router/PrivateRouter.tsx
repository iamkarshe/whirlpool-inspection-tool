import { Toaster } from "@/components/ui/sonner";
import { PAGES } from "@/endpoints";
import DashboardLayout from "@/pages/dashboard/layout";
import { Navigate, useLocation } from "react-router-dom";

const ACCESS_TOKEN_KEY = "whirlpool.access_token";

export default function PrivateRouter() {
  const location = useLocation();
  const hasToken =
    typeof window !== "undefined" &&
    Boolean(window.localStorage.getItem(ACCESS_TOKEN_KEY)?.trim());

  if (!hasToken) {
    return (
      <Navigate to={PAGES.LOGIN} replace state={{ from: location.pathname }} />
    );
  }

  return (
    <>
      <DashboardLayout />
      <Toaster />
    </>
  );
}
