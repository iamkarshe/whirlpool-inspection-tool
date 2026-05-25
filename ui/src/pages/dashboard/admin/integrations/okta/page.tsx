import { AlertCircle, Loader2 } from "lucide-react";
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
    <>
      <Card className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Okta SSO</CardTitle>
          <CardDescription>
            Configure Okta as identity provider for single sign-on.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="px-6">
            <div className="grid gap-4 sm:grid-cols-2">
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
                  disabled
                />
              </div>
              <div className="grid gap-2">
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
                <Label htmlFor="client_secret">Client Secret</Label>
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
            {saveError ? (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Save failed</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter className="mt-5 flex justify-end">
            <Button type="submit" disabled={saving}>
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

      <Card className="my-4 flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Configure Okta SSO with OAuth application</CardTitle>
          <CardDescription>
            Follow these steps to configure Okta as the identity provider for
            single sign-on in your environment.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="mb-2 text-sm font-semibold">
              Required values from your Okta admin console
            </h3>

            <div className="grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-md border bg-background p-3">
                <div className="font-medium">Okta Domain</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Example: https://trial-5808139.okta.com
                </div>
              </div>

              <div className="rounded-md border bg-background p-3">
                <div className="font-medium">Client ID</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Generated after creating the Okta application.
                </div>
              </div>

              <div className="rounded-md border bg-background p-3">
                <div className="font-medium">Client Secret</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Available under the application client credentials section.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex gap-4 rounded-lg border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                1
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Create a new Okta app integration
                </h3>

                <p className="text-sm text-muted-foreground">
                  Go to the Okta Admin Console and create a new app integration.
                </p>

                <div className="rounded-md bg-muted p-3 text-sm">
                  <div>
                    <span className="font-medium">Sign-in method:</span> OIDC -
                    OpenID Connect
                  </div>
                  <div>
                    <span className="font-medium">Application type:</span> Web
                    Application
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                2
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Configure the application properties
                </h3>

                <p className="text-sm text-muted-foreground">
                  Enter the application name and configure the redirect URLs.
                </p>

                <div className="space-y-3 rounded-md bg-muted p-3 text-sm">
                  <div>
                    <div className="font-medium">Application name</div>
                    <code className="mt-1 block rounded bg-background px-2 py-1 text-xs">
                      Whirlpool PDI
                    </code>
                  </div>

                  <div>
                    <div className="font-medium">Sign-in redirect URI</div>
                    <code className="mt-1 block rounded bg-background px-2 py-1 text-xs">
                      https://whirlpool.scoptanalytics.in/authorization-code/callback
                    </code>
                  </div>

                  <div>
                    <div className="font-medium">Sign-out redirect URI</div>
                    <code className="mt-1 block rounded bg-background px-2 py-1 text-xs">
                      https://whirlpool.scoptanalytics.in
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                3
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Enable the required grant type
                </h3>

                <p className="text-sm text-muted-foreground">
                  Make sure the application uses the Authorization Code flow for
                  OAuth 2.0 login.
                </p>

                <div className="rounded-md bg-muted p-3 text-sm">
                  <div>
                    <span className="font-medium">Grant type:</span>{" "}
                    Authorization Code
                  </div>
                  <div>
                    <span className="font-medium">Refresh Token:</span>{" "}
                    Optional, enable only if your backend requires refresh token
                    support.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                4
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Copy the client credentials
                </h3>

                <p className="text-sm text-muted-foreground">
                  After saving the application, copy the values required for
                  backend integration.
                </p>

                <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
                  <div>
                    <span className="font-medium">Okta Domain:</span>{" "}
                    <code className="rounded bg-background px-1 py-0.5 text-xs">
                      https://your-okta-domain.okta.com
                    </code>
                  </div>

                  <div>
                    <span className="font-medium">Okta Client ID:</span>{" "}
                    <code className="rounded bg-background px-1 py-0.5 text-xs">
                      Generated by Okta
                    </code>
                  </div>

                  <div>
                    <span className="font-medium">Okta Client Secret:</span>{" "}
                    <code className="rounded bg-background px-1 py-0.5 text-xs">
                      Generated by Okta
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg border p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                5
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Configure authorization server access policy
                </h3>

                <p className="text-sm text-muted-foreground">
                  Go to the Okta access policy section and make sure the OAuth
                  application is allowed to issue tokens.
                </p>

                <div className="rounded-md bg-muted p-3 text-sm">
                  <div className="font-medium">Navigation path</div>
                  <code className="mt-1 block rounded bg-background px-2 py-1 text-xs">
                    Security → API → Authorization Servers → default → Access
                    Policies
                  </code>

                  <div className="mt-3 font-medium">Recommended rule setup</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                    <li>Grant type should include Authorization Code.</li>
                    <li>
                      User should be assigned to the application or group.
                    </li>
                    <li>
                      Scopes can be set to any scopes, or restricted as needed.
                    </li>
                    <li>
                      Access token lifetime can be configured as per policy.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-semibold text-white">
                !
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Important note</h3>
                <p className="text-sm">
                  The Okta Domain, Client ID, and Client Secret must be shared
                  with the backend team. Without these values, OAuth login
                  cannot be completed.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
