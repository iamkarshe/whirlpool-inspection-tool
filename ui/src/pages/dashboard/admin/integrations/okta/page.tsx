import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useState } from "react";
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
  fetchIntegrationsCredentials,
  integrationsApiErrorMessage,
  updateOktaSsoIntegration,
} from "@/services/integrations-api";
import { AlertCircle, Loader2 } from "lucide-react";

export default function IntegrationsOktaPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [oktaDomain, setOktaDomain] = useState("");
  const [clientId, setClientId] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchIntegrationsCredentials()
      .then((res) => {
        if (cancelled) return;
        const o = res.okta_sso;
        setOktaDomain(o.okta_domain ?? "");
        setClientId(o.client_id ?? "");
        setRedirectUri(o.redirect_uri ?? "");
        setClientSecret(o.client_secret ?? "");
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            integrationsApiErrorMessage(e, "Could not load Okta SSO settings."),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      const res = await updateOktaSsoIntegration({
        okta_domain: oktaDomain.trim(),
        client_id: clientId.trim(),
        redirect_uri: redirectUri.trim(),
        client_secret: clientSecret.trim(),
      });
      const o = res.okta_sso;
      setOktaDomain(o.okta_domain ?? "");
      setClientId(o.client_id ?? "");
      setRedirectUri(o.redirect_uri ?? "");
      setClientSecret(o.client_secret ?? "");
      toast.success("Okta SSO settings saved.");
    } catch (e: unknown) {
      setSaveError(
        integrationsApiErrorMessage(e, "Could not save Okta SSO settings."),
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-2 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading Okta SSO…</p>
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
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Okta SSO</CardTitle>
        <CardDescription>
          Configure Okta as your identity provider for single sign-on. Values are
          stored server-side; submit to update.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="okta_domain">Okta domain</Label>
              <Input
                id="okta_domain"
                name="okta_domain"
                value={oktaDomain}
                onChange={onField(setOktaDomain)}
                placeholder="https://your-domain.okta.com"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client_id">Client ID</Label>
              <Input
                id="client_id"
                name="client_id"
                value={clientId}
                onChange={onField(setClientId)}
                placeholder="0oa…"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="redirect_uri">Redirect URI</Label>
              <Input
                id="redirect_uri"
                name="redirect_uri"
                value={redirectUri}
                onChange={onField(setRedirectUri)}
                placeholder="https://app.example.com/callback"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="client_secret">Client secret</Label>
              <Input
                id="client_secret"
                name="client_secret"
                type="password"
                value={clientSecret}
                onChange={onField(setClientSecret)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          {saveError ?
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Save failed</AlertTitle>
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          : null}
        </CardContent>
        <CardFooter className="mt-5 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ?
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            : "Save configuration"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
