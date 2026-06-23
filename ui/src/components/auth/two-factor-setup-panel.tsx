import { Copy, Loader2 } from "lucide-react";
import type { SubmitEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import type { TwoFactorSetupStartResponse } from "@/api/generated/model/twoFactorSetupStartResponse";
import { TotpCodeInput } from "@/components/auth/totp-code-input";
import { TotpQrCode } from "@/components/auth/totp-qr-code";
import { Button } from "@/components/ui/button";
import { isValidTotpCode } from "@/services/two-factor-api";

export type TwoFactorSetupPanelProps = {
  setup: TwoFactorSetupStartResponse;
  email?: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (totpCode: string) => void | Promise<void>;
};

export function TwoFactorSetupPanel({
  setup,
  email,
  isSubmitting = false,
  submitLabel = "Complete setup",
  onSubmit,
}: TwoFactorSetupPanelProps) {
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!isValidTotpCode(totpCode) || isSubmitting) return;
    void Promise.resolve(onSubmit(totpCode));
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(setup.secret_key);
      toast.success("Secret key copied.");
    } catch {
      toast.error("Could not copy the secret key.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <TotpQrCode provisioningUri={setup.provisioning_uri} />
        <div className="space-y-2 text-sm">
          <p>
            Scan this QR code with Google Authenticator, Authy, Microsoft
            Authenticator, or a compatible app.
          </p>
          {email ? (
            <p className="text-muted-foreground">
              Account: <span className="font-medium">{email}</span>
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Issuer: <span className="font-medium">{setup.issuer}</span>
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Manual entry key
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="bg-background rounded px-2 py-1 font-mono text-sm break-all">
            {setup.secret_key}
          </code>
          <Button type="button" variant="outline" size="sm" onClick={() => void copySecret()}>
            <Copy className="mr-1 h-4 w-4" />
            Copy
          </Button>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <TotpCodeInput value={totpCode} onChange={setTotpCode} disabled={isSubmitting} />
        <Button
          type="submit"
          className="w-full"
          disabled={!isValidTotpCode(totpCode) || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Verifying…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </div>
  );
}
