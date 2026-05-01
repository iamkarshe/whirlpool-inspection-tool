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
  updateAwsS3Integration,
} from "@/services/integrations-api";
import { AlertCircle, Loader2 } from "lucide-react";

export default function IntegrationsAwsS3Page() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchIntegrationsCredentials()
      .then((res) => {
        if (cancelled) return;
        const s = res.aws_s3;
        setBucketName(s.bucket_name ?? "");
        setRegion(s.region ?? "");
        setAccessKeyId(s.access_key_id ?? "");
        setSecretAccessKey(s.secret_access_key ?? "");
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadError(
            integrationsApiErrorMessage(e, "Could not load AWS S3 settings."),
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
      const res = await updateAwsS3Integration({
        bucket_name: bucketName.trim(),
        region: region.trim(),
        access_key_id: accessKeyId.trim(),
        secret_access_key: secretAccessKey.trim(),
      });
      const s = res.aws_s3;
      setBucketName(s.bucket_name ?? "");
      setRegion(s.region ?? "");
      setAccessKeyId(s.access_key_id ?? "");
      setSecretAccessKey(s.secret_access_key ?? "");
      toast.success("AWS S3 settings saved.");
    } catch (e: unknown) {
      setSaveError(
        integrationsApiErrorMessage(e, "Could not save AWS S3 settings."),
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
          <p className="text-muted-foreground text-sm">Loading AWS S3…</p>
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
        <CardTitle>AWS S3</CardTitle>
        <CardDescription>
          Configure AWS S3 for inspection attachments and exports. There is no
          separate connectivity probe; saving persists credentials via the API.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="bucket_name">Bucket name</Label>
              <Input
                id="bucket_name"
                name="bucket_name"
                value={bucketName}
                onChange={onField(setBucketName)}
                placeholder="my-bucket"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                name="region"
                value={region}
                onChange={onField(setRegion)}
                placeholder="us-east-1"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="access_key_id">Access Key ID</Label>
              <Input
                id="access_key_id"
                name="access_key_id"
                type="text"
                value={accessKeyId}
                onChange={onField(setAccessKeyId)}
                placeholder="AKIA…"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="secret_access_key">Secret Access Key</Label>
              <Input
                id="secret_access_key"
                name="secret_access_key"
                type="password"
                value={secretAccessKey}
                onChange={onField(setSecretAccessKey)}
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
