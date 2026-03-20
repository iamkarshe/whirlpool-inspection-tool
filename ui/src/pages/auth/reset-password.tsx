import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGES } from "@/endpoints";
import AuthLayout from "@/pages/auth/layout";
import { Link } from "react-router-dom";

export default function ResetPasswordConfirmationPage() {
  return (
    <AuthLayout title="Check your email">
      <Card className="mx-auto w-full max-w-96 sm:w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            If an account exists for this email, we&apos;ve sent a password
            reset link. Please check your inbox and follow the instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn&apos;t receive the email? Remember to check your spam folder or
            try again after a few minutes.
          </p>
          <Button type="button" asChild className="w-full">
            <Link to={PAGES.LOGIN}>Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

