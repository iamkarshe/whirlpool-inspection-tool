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
import { Loader2 } from "lucide-react";
import type { SubmitEvent } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function IntegrationsAwsS3Page() {
  const formRef = useRef<HTMLFormElement>(null);
  const [testing, setTesting] = useState(false);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire real API to update S3 config
    toast.success("Keys updated successfully.");
  };

  const handleTestConnection = async () => {
    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const bucket = (data.get("bucket") as string)?.trim();
    const region = (data.get("region") as string)?.trim();
    const accessKeyId = (data.get("accessKeyId") as string)?.trim();
    const secretAccessKey = (data.get("secretAccessKey") as string)?.trim();

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      toast.error(
        "Please fill in bucket, region, access key, and secret key to test the connection.",
      );
      return;
    }

    setTesting(true);
    try {
      // TODO: replace with real API call to validate S3 credentials
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success("Connection successful. S3 credentials are valid.");
    } catch {
      toast.error("Connection failed. Check your credentials and try again.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>AWS S3</CardTitle>
        <CardDescription>
          Configure AWS S3 buckets for storage (e.g. inspection attachments,
          exports).
        </CardDescription>
      </CardHeader>
      <form ref={formRef} onSubmit={handleSubmit}>
        <CardContent className="px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="bucket">Bucket name</Label>
              <Input
                id="bucket"
                name="bucket"
                placeholder="my-bucket"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                name="region"
                placeholder="us-east-1"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="accessKeyId">Access Key ID</Label>
              <Input
                id="accessKeyId"
                name="accessKeyId"
                type="text"
                placeholder="AKIA..."
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="secretAccessKey">Secret Access Key</Label>
              <Input
                id="secretAccessKey"
                name="secretAccessKey"
                type="password"
                placeholder="••••••••"
                autoComplete="off"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end mt-5">
          <Button type="submit">Update</Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing…
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
