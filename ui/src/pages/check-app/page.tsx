import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { PAGES } from "@/endpoints";
import { Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type ConnectionState = "checking" | "offline" | "ready";

function safeReadRole() {
  if (typeof window === "undefined") return null;
  const role = window.localStorage.getItem("whirlpool.role");
  return role === "ops" || role === "admin" ? role : null;
}

async function checkConnection() {
  if (typeof window === "undefined") return false;
  if (!window.navigator.onLine) return false;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 3000);

  try {
    const res = await window.fetch(window.location.origin, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    return res.status < 500;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function CheckAppPage() {
  const navigate = useNavigate();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("checking");
  const [retryKey, setRetryKey] = useState(0);

  const statusText = useMemo(() => {
    if (connectionState === "offline") return "No connection. Retrying helps.";
    if (connectionState === "ready") return "Connecting…";
    return "Checking connection…";
  }, [connectionState]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setConnectionState("checking");

      const ok = await checkConnection();
      if (cancelled) return;

      if (!ok) {
        setConnectionState("offline");
        return;
      }

      setConnectionState("ready");

      // Simulated auth routing based on the role stored during login.
      const role = safeReadRole();
      if (cancelled) return;

      if (role === "ops") navigate(PAGES.OPS_HOME);
      else if (role === "admin") navigate(PAGES.DASHBOARD);
      else navigate(PAGES.LOGIN);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate, retryKey]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div
          key={retryKey}
          className="mx-auto flex items-center justify-center animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <BrandLogo />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {statusText}
          </p>
          <p className="text-xs text-muted-foreground">
            This app uses online services for syncing and submissions.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          {connectionState === "checking" || connectionState === "ready" ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <RefreshCcw className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {connectionState === "offline" && (
          <div className="pt-2">
            <Button
              type="button"
              className="w-full"
              onClick={() => setRetryKey((k) => k + 1)}
            >
              Retry connection
            </Button>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate(PAGES.LOGIN)}
              >
                Continue to login
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

