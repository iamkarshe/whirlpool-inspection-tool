import { ChangePasswordForm } from "@/components/auth/change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSessionUser } from "@/hooks/use-session-user";
import { markPasswordChangeComplete } from "@/lib/session-password-flags";
import { toast } from "sonner";

export default function SettingsPasswordPage() {
  const sessionUser = useSessionUser();
  const userInputs = sessionUser
    ? [sessionUser.email, sessionUser.name].filter(Boolean)
    : [];

  return (
    <Card className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Update password</CardTitle>
        <CardDescription>
          Choose a strong, unique password to keep your account secure.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <ChangePasswordForm
          mode="voluntary"
          userInputs={userInputs}
          onSuccess={() => {
            markPasswordChangeComplete();
            toast.success("Password updated successfully.");
          }}
        />
      </CardContent>
    </Card>
  );
}
