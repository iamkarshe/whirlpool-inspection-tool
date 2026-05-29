import { Navigate } from "react-router-dom";

import { PAGES } from "@/endpoints";

export default function AnalyticsPage() {
  return (
    <Navigate to={PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS} replace />
  );
}
