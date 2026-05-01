import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import LoginsDataTable from "@/pages/dashboard/admin/logins/data-table";
import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-service";
import { getLoginsByUserHints } from "@/pages/dashboard/admin/logins/login-service";
import type { UserViewContext } from "./context";

export default function UserViewLoginsPage() {
  const { user } = useOutletContext<UserViewContext>();
  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    const abort = new AbortController();
    getLoginsByUserHints(
      { email: user.email, name: user.name },
      { signal: abort.signal },
    )
      .then((data) => {
        if (!cancelled) setLogins(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [user.email, user.id, user.name]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <LoginsDataTable data={logins} />;
}
