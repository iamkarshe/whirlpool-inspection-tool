import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGES } from "@/endpoints";
import {
  LogLevelBadge,
  LogSourceBadge,
} from "@/pages/dashboard/admin/log/log-badge";
import {
  getLogById,
  type Log,
} from "@/pages/dashboard/admin/log/log-service";
import { formatDate } from "@/lib/core";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

export default function LogViewPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [log, setLog] = useState<Log | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLog(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getLogById(id)
      .then((data) => {
        if (!cancelled) setLog(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (log === null || log === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Log not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_LOGS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to logs
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to={PAGES.DASHBOARD_ADMIN_LOGS}
            aria-label="Back to logs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {log.id}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <LogLevelBadge level={log.level} />
            <LogSourceBadge source={log.source} />
            <Badge variant="outline" className="font-normal">
              {formatDate(log.timestamp)}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{log.message}</p>
          <div className="grid gap-3 border-t border-border pt-4 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Source</span>
              <LogSourceBadge source={log.source} />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-muted-foreground">Timestamp</span>
              <span className="font-mono text-xs">
                {formatDate(log.timestamp)}
              </span>
            </div>
            {log.user_id != null && log.user_name ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">User</span>
                <span className="font-medium">{log.user_name}</span>
              </div>
            ) : null}
            {log.details ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Details</span>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {log.details}
                </pre>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
