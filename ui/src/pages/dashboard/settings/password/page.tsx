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
import type { SubmitEvent } from "react";

export default function SettingsPasswordPage() {
  const handlePasswordSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire real password update; mocked for now.
  };

  return (
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Update password</CardTitle>
        <CardDescription>
          Choose a strong, unique password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handlePasswordSubmit}>
        <CardContent className="px-6">
          <div className="flex flex-col gap-4 md:flex-row md:gap-6">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="grid flex-1 gap-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end mt-5">
          <Button type="submit">Update password</Button>
        </CardFooter>
      </form>
    </Card>
  );
}
