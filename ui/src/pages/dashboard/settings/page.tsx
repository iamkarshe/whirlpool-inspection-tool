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
import type { FormEvent } from "react";

type SubmitEvent = FormEvent<HTMLFormElement>;

export default function SettingsPage() {
  const handlePasswordSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    // TODO: wire real password update; mocked for now.
  };

  const handleLogoutEverywhere = () => {
    // TODO: wire real global logout; mocked for now.
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account security and active sessions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Update password</CardTitle>
          <CardDescription>
            Choose a strong, unique password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="mt-2 flex justify-end gap-2 pt-2">
            <Button type="submit">Update password</Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log out from all devices</CardTitle>
          <CardDescription>
            End every active session on web and mobile. You will stay logged in
            on this browser.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            type="button"
            onClick={handleLogoutEverywhere}
          >
            Log out everywhere
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
