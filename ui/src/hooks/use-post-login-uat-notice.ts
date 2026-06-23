import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { PAGES } from "@/endpoints";
import { isNonProductionAppHost } from "@/lib/app-environment";
import { consumeUatNoticeAfterLogin } from "@/lib/uat-environment-notice";

/** Shows the UAT notice dialog once after login (skipped on Executive Analytics). */
export function usePostLoginUatNotice() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isNonProductionAppHost()) return;
    if (!consumeUatNoticeAfterLogin()) return;
    if (location.pathname === PAGES.DASHBOARD_REPORTS_EXECUTIVE_ANALYTICS) {
      return;
    }
    setOpen(true);
  }, [location.pathname]);

  return { open, setOpen };
}
