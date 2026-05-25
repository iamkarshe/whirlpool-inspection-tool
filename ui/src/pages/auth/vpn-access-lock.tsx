import { Loader2, Lock, RefreshCcw, ShieldAlert } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type VpnAccessLockProps = {
  appName?: string;
  apiVersion?: string;
  isRetrying?: boolean;
  onRetry?: () => void;
};

export function VpnAccessLock({
  appName = "Whirlpool Inspection Tool",
  apiVersion,
  isRetrying = false,
  onRetry,
}: VpnAccessLockProps) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <BrandLogo />
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Lock className="size-7" aria-hidden />
        </div>
        <CardTitle className="text-2xl">Access restricted</CardTitle>
        <CardDescription>
          {appName} is available only from approved corporate networks.
        </CardDescription>
        {apiVersion ? (
          <p className="font-mono text-xs text-muted-foreground">
            API {apiVersion}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        <Alert variant="destructive">
          <ShieldAlert className="size-4" />
          <AlertTitle>Connect to VPN</AlertTitle>
          <AlertDescription>
            Your current network is not allowed to use this application. Connect
            to your company VPN, then retry. If you are already on VPN, contact
            your IT administrator.
          </AlertDescription>
        </Alert>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isRetrying}
            onClick={onRetry}
          >
            {isRetrying ? (
              <>
                <Loader2 className="animate-spin" />
                Checking access…
              </>
            ) : (
              <>
                <RefreshCcw />
                Check again
              </>
            )}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
