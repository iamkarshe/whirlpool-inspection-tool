import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import LoginsDataTable from "@/pages/dashboard/admin/logins/data-table";
import {
  getLogins,
  type LoginActivity,
} from "@/pages/dashboard/admin/logins/login-service";
import { useEffect, useState } from "react";

export default function LoginsPage() {
  const [logins, setLogins] = useState<LoginActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLogins()
      .then(setLogins)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Logins"
        description="View logins and authentication activity."
      />
      {isLoading ? <SkeletonTable /> : <LoginsDataTable data={logins} />}
    </div>
  );
}
