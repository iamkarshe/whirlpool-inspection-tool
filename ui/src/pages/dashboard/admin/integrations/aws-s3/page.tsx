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
import { toast } from "sonner";
import type { SubmitEvent } from "react";

export default function IntegrationsAwsS3Page() {
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire real API to update S3 config
    toast.success("Keys updated successfully.");
  };

  return (
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>AWS S3 Bucket config</CardTitle>
        <CardDescription>
          Configure S3 buckets for storage (e.g. inspection attachments,
          exports).
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
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
        </CardFooter>
      </form>
    </Card>
  );
}
