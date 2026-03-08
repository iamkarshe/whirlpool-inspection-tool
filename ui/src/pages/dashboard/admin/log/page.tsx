import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import LogsDataTable from "@/pages/dashboard/admin/log/data-table";
import { getLogs, type Log } from "@/pages/dashboard/admin/log/log-service";
import { useEffect, useState } from "react";

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLogs()
      .then(setLogs)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Logs"
        description="Application and audit logs."
      />
      {isLoading ? <SkeletonTable /> : <LogsDataTable data={logs} />}
    </div>
  );
}
