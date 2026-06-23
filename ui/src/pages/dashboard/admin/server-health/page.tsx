import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { ServerHealthSnapshot } from "@/api/generated/model/serverHealthSnapshot";
import PageActionBar from "@/components/page-action-bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TimeDisplay } from "@/components/time-display";
import { useServerHealthStream } from "@/hooks/use-server-health-stream";
import { ConnectionStatusBadge } from "@/pages/dashboard/admin/server-health/components/connection-status-badge";
import { DisksPanel } from "@/pages/dashboard/admin/server-health/components/disks-panel";
import { MetricsPanel } from "@/pages/dashboard/admin/server-health/components/metrics-panel";
import { ProcessesPanel } from "@/pages/dashboard/admin/server-health/components/processes-panel";
import {
  fetchServerHealthSnapshot,
  serverHealthApiErrorMessage,
} from "@/services/server-health-api";

export default function ServerHealthPage() {
  const [restSnapshot, setRestSnapshot] = useState<ServerHealthSnapshot | null>(
    null,
  );
  const [restLoading, setRestLoading] = useState(true);
  const [restError, setRestError] = useState<string | null>(null);

  const {
    snapshot: wsSnapshot,
    status,
    closeReason,
    reconnect,
  } = useServerHealthStream(true);

  const snapshot = wsSnapshot ?? restSnapshot;

  const loadSnapshot = useCallback(async () => {
    setRestLoading(true);
    try {
      const data = await fetchServerHealthSnapshot();
      setRestSnapshot(data);
      setRestError(null);
    } catch (err: unknown) {
      setRestError(serverHealthApiErrorMessage(err));
    } finally {
      setRestLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadSnapshot());
  }, [loadSnapshot]);

  const handleRefresh = () => {
    void loadSnapshot();
    reconnect();
  };

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Server Health"
        description="Live CPU, memory, disk, and process metrics for the application server."
      >
        <ConnectionStatusBadge
          status={status}
          closeReason={closeReason}
          onReconnect={reconnect}
          onRefresh={handleRefresh}
          isRefreshing={restLoading}
        />
      </PageActionBar>

      {restError && !snapshot ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load server health</AlertTitle>
          <AlertDescription>{restError}</AlertDescription>
        </Alert>
      ) : null}

      {status === "reconnecting" || status === "closed" ? (
        <Alert>
          <AlertTitle>Live stream disconnected</AlertTitle>
          <AlertDescription>
            {closeReason ??
              "Trying to reconnect to the server health WebSocket."}
          </AlertDescription>
        </Alert>
      ) : null}

      {restLoading && !snapshot ? (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading server metrics…
        </div>
      ) : null}

      {snapshot ? (
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Last updated{" "}
            <TimeDisplay iso={snapshot.collected_at} className="text-inherit" />
          </p>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
            <MetricsPanel snapshot={snapshot} />
            <DisksPanel disks={snapshot.disks} />
          </div>
          <ProcessesPanel
            processes={snapshot.processes}
            slowProcesses={snapshot.slow_processes}
          />
        </div>
      ) : null}
    </div>
  );
}
