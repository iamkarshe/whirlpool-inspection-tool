import { SmtpEncryption } from "@/api/generated/model/smtpEncryption";
import { SmtpProvider } from "@/api/generated/model/smtpProvider";
import type { SmtpEncryption as SmtpEncryptionType } from "@/api/generated/model/smtpEncryption";
import type { SmtpProvider as SmtpProviderType } from "@/api/generated/model/smtpProvider";
import type { SmtpTestConnectionResponse } from "@/api/generated/model/smtpTestConnectionResponse";
import type { SmtpUpdateRequest } from "@/api/generated/model/smtpUpdateRequest";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchIntegrationsCredentials,
  integrationsApiErrorMessage,
  testSmtpConnection,
  updateSmtpIntegration,
} from "@/services/integrations-api";

import { SmtpTestConnectionDialog } from "./smtp-test-connection-dialog";

const PROVIDER_OPTIONS: { value: SmtpProviderType; label: string }[] = [
  { value: SmtpProvider.aws_ses, label: "AWS SES" },
  { value: SmtpProvider.google_workspace, label: "Google Workspace" },
  {
    value: SmtpProvider.google_workspace_relay,
    label: "Google Workspace (relay)",
  },
  { value: SmtpProvider.custom_smtp, label: "Custom SMTP" },
];

const ENCRYPTION_OPTIONS: { value: SmtpEncryptionType; label: string }[] = [
  { value: SmtpEncryption.starttls, label: "STARTTLS" },
  { value: SmtpEncryption.ssl, label: "SSL/TLS" },
  { value: SmtpEncryption.none, label: "None" },
];

function isMaskedSecret(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && /^[*•]+$/.test(v);
}

function parsePort(value: string): number | undefined {
  const n = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535) return undefined;
  return n;
}

function parseTimeout(value: string): number | undefined {
  const n = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(n) || n < 1 || n > 300) return undefined;
  return n;
}

function applySmtpFromResponse(s: {
  provider?: SmtpProviderType | null;
  host?: string;
  port?: number;
  encryption?: SmtpEncryptionType | string;
  username?: string;
  password?: string;
  from_email?: string;
  from_name?: string;
  timeout_seconds?: number;
  auth_enabled?: boolean;
}) {
  return {
    provider: (s.provider as SmtpProviderType) || SmtpProvider.custom_smtp,
    host: s.host ?? "",
    port: s.port != null ? String(s.port) : "587",
    encryption: (s.encryption as SmtpEncryptionType) || SmtpEncryption.starttls,
    username: s.username ?? "",
    password: s.password ?? "",
    fromEmail: s.from_email ?? "",
    fromName: s.from_name ?? "",
    timeout: s.timeout_seconds != null ? String(s.timeout_seconds) : "30",
  };
}

export default function IntegrationsSmtpPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [provider, setProvider] = useState<SmtpProviderType>(
    SmtpProvider.custom_smtp,
  );
  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [encryption, setEncryption] = useState<SmtpEncryptionType>(
    SmtpEncryption.starttls,
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [timeout, setTimeout] = useState("30");

  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] =
    useState<SmtpTestConnectionResponse | null>(null);
  const [testRequestError, setTestRequestError] = useState<string | null>(null);

  const isRelay = provider === SmtpProvider.google_workspace_relay;
  const isCustomSmtp = provider === SmtpProvider.custom_smtp;
  const credentialsOptional = isRelay || isCustomSmtp;

  const isSmtpAuthEnabled = useMemo(() => {
    if (isRelay) return false;
    if (isCustomSmtp) {
      const hasUsername = Boolean(username.trim());
      const hasPassword =
        Boolean(password.trim()) && !isMaskedSecret(password);
      return hasUsername || hasPassword;
    }
    return true;
  }, [isRelay, isCustomSmtp, username, password]);

  const canTestWithFormValues = useMemo(() => {
    if (!fromEmail.trim()) return false;
    if (isRelay || (isCustomSmtp && !isSmtpAuthEnabled)) return true;
    if (!username.trim()) return false;
    if (!password.trim() || isMaskedSecret(password)) return false;
    return true;
  }, [fromEmail, isRelay, isCustomSmtp, isSmtpAuthEnabled, username, password]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchIntegrationsCredentials()
      .then((res) => {
        if (cancelled) return;
        const next = applySmtpFromResponse(res.smtp);
        setProvider(next.provider);
        setHost(next.host);
        setPort(next.port);
        setEncryption(next.encryption);
        setUsername(next.username);
        setPassword(next.password);
        setFromEmail(next.fromEmail);
        setFromName(next.fromName);
        setTimeout(next.timeout);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            integrationsApiErrorMessage(e, "Could not load SMTP settings."),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvePasswordForPayload = (): string => {
    const trimmed = password.trim();
    if (isRelay && (!trimmed || isMaskedSecret(trimmed))) return "-";
    if (!isSmtpAuthEnabled) return "";
    return trimmed;
  };

  const buildPayload = (): SmtpUpdateRequest & { auth_enabled: boolean } => ({
    provider,
    host: host.trim() || undefined,
    port: parsePort(port),
    encryption,
    auth_enabled: isSmtpAuthEnabled,
    username: username.trim() || undefined,
    password: resolvePasswordForPayload(),
    from_email: fromEmail.trim(),
    from_name: fromName.trim() || undefined,
    timeout_seconds: parseTimeout(timeout),
  });

  const openTestDialog = () => {
    setTestResult(null);
    setTestRequestError(null);
    setTestDialogOpen(true);
  };

  const handleRunTest = async (toEmail: string) => {
    setTesting(true);
    setTestResult(null);
    setTestRequestError(null);
    try {
      const res = await testSmtpConnection({
        to_email: toEmail,
        smtp: canTestWithFormValues ? buildPayload() : null,
      });
      setTestResult(res);
    } catch (e: unknown) {
      setTestRequestError(
        integrationsApiErrorMessage(e, "Could not send test email."),
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);

    if (
      isSmtpAuthEnabled &&
      (!password.trim() || isMaskedSecret(password))
    ) {
      setSaveError(
        "Enter the SMTP password to save (masked values cannot be reused).",
      );
      return;
    }

    setSaving(true);
    try {
      const res = await updateSmtpIntegration(buildPayload());
      const next = applySmtpFromResponse(res.smtp);
      setProvider(next.provider);
      setHost(next.host);
      setPort(next.port);
      setEncryption(next.encryption);
      setUsername(next.username);
      setPassword(next.password);
      setFromEmail(next.fromEmail);
      setFromName(next.fromName);
      setTimeout(next.timeout);
      toast.success("SMTP settings saved.");
    } catch (e: unknown) {
      setSaveError(
        integrationsApiErrorMessage(e, "Could not save SMTP settings."),
      );
    } finally {
      setSaving(false);
    }
  };

  const onField =
    (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      if (saveError) setSaveError(null);
      setter(e.target.value);
    };

  const onProviderChange = (value: string) => {
    if (saveError) setSaveError(null);
    const next = value as SmtpProviderType;
    setProvider(next);
    if (next === SmtpProvider.google_workspace && !host.trim()) {
      setHost("smtp.gmail.com");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-2 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading SMTP…</p>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Could not load settings</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Card className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>SMTP</CardTitle>
          <CardDescription>
            Configure outbound email for notifications and system messages.
            Supported providers include AWS SES, Google Workspace, and custom
            SMTP.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="smtp_provider">Provider</Label>
                <Select value={provider} onValueChange={onProviderChange}>
                  <SelectTrigger id="smtp_provider" className="w-full">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="smtp_host">Host</Label>
                <Input
                  id="smtp_host"
                  name="host"
                  value={host}
                  onChange={onField(setHost)}
                  placeholder={
                    provider === SmtpProvider.google_workspace
                      ? "smtp.gmail.com"
                      : "smtp.example.com"
                  }
                  autoComplete="off"
                />
                <p className="text-muted-foreground text-xs">
                  Leave blank to use the provider default when available.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="smtp_port">Port</Label>
                <Input
                  id="smtp_port"
                  name="port"
                  type="number"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={onField(setPort)}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="smtp_encryption">Encryption</Label>
                <Select
                  value={encryption}
                  onValueChange={(v) => {
                    if (saveError) setSaveError(null);
                    setEncryption(v as SmtpEncryptionType);
                  }}
                >
                  <SelectTrigger id="smtp_encryption" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENCRYPTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="smtp_username">
                  Username{credentialsOptional ? " (optional)" : ""}
                </Label>
                <Input
                  id="smtp_username"
                  name="username"
                  value={username}
                  onChange={onField(setUsername)}
                  placeholder="user@company.com"
                  autoComplete="off"
                  disabled={isRelay}
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="smtp_password">
                  Password
                  {isRelay
                    ? " (not used for relay)"
                    : isCustomSmtp
                      ? " (optional)"
                      : ""}
                </Label>
                <Input
                  id="smtp_password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={onField(setPassword)}
                  placeholder={
                    isRelay ? "Leave blank when unchanged" : "••••••••"
                  }
                  autoComplete="new-password"
                  required={!credentialsOptional}
                />
                {isRelay ? (
                  <p className="text-muted-foreground text-xs">
                    Relay mode does not authenticate with username/password; a
                    placeholder is stored if the field is left blank.
                  </p>
                ) : isCustomSmtp ? (
                  <p className="text-muted-foreground text-xs">
                    Leave username and password blank for SMTP servers that do
                    not require authentication (auth is enabled when either
                    field is set).
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="smtp_from_email">From email</Label>
                <Input
                  id="smtp_from_email"
                  name="from_email"
                  type="email"
                  value={fromEmail}
                  onChange={onField(setFromEmail)}
                  placeholder="noreply@company.com"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="smtp_from_name">From name</Label>
                <Input
                  id="smtp_from_name"
                  name="from_name"
                  value={fromName}
                  onChange={onField(setFromName)}
                  placeholder="Whirlpool Inspection Tool"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="smtp_timeout">Timeout (seconds)</Label>
                <Input
                  id="smtp_timeout"
                  name="timeout_seconds"
                  type="number"
                  min={1}
                  max={300}
                  value={timeout}
                  onChange={onField(setTimeout)}
                  autoComplete="off"
                />
              </div>
            </div>

            {saveError ? (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>

          <CardFooter className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={testing || saving}
              onClick={openTestDialog}
            >
              Test email connection
            </Button>
            <Button type="submit" disabled={saving || testing}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save configuration"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <SmtpTestConnectionDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        testing={testing}
        result={testResult}
        requestError={testRequestError}
        useFormValues={canTestWithFormValues}
        onRunTest={(to) => void handleRunTest(to)}
      />
    </>
  );
}
