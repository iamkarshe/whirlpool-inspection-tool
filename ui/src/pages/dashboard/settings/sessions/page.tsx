import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";

export default function SettingsSessionsPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLogoutEverywhere = () => {
    // TODO: wire real global logout; mocked for now.
    setConfirmOpen(false);
  };

  return (
    <>
      <Card className="flex flex-col gap-6">
        <CardHeader>
          <CardTitle>Log out from all devices</CardTitle>
          <CardDescription>
            End every active session on web and mobile. You will stay logged in
            on this browser.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="destructive"
            type="button"
            onClick={() => setConfirmOpen(true)}
          >
            Log out everywhere
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out from all devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end every active session on web and mobile. You will
              stay logged in on this browser only.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleLogoutEverywhere}
            >
              Log out everywhere
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
