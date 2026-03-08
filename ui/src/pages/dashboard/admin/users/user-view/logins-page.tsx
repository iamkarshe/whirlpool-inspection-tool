import LoginsDataTable from "@/pages/dashboard/admin/logins/data-table";
import type { LoginActivity } from "@/pages/dashboard/admin/logins/login-service";
import { getLoginsByUserId } from "@/pages/dashboard/admin/logins/login-service";
import type { User } from "@/pages/dashboard/admin/users/user-service";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

type UserViewContext = { user: User };

export default function UserViewLoginsPage() {
  const { user } = useOutletContext<UserViewContext>();
  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLoginsByUserId(user.id)
      .then((data) => {
        if (!cancelled) setLogins(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <LoginsDataTable data={logins} />;
}
