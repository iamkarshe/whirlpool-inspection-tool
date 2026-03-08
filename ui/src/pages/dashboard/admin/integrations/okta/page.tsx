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

export default function IntegrationsOktaPage() {
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire real API to update Okta SSO config
    toast.success("Okta SSO config updated successfully.");
  };

  return (
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Okta SSO</CardTitle>
        <CardDescription>
          Configure Okta as your identity provider for single sign-on.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="domain">Okta domain</Label>
              <Input
                id="domain"
                name="domain"
                placeholder="https://your-domain.okta.com"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                name="clientId"
                placeholder="0oa..."
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="redirectUri">Redirect URI</Label>
              <Input
                id="redirectUri"
                name="redirectUri"
                placeholder="https://app.example.com/callback"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="clientSecret">Client secret</Label>
              <Input
                id="clientSecret"
                name="clientSecret"
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
