import { ArrowRightIcon, Loader2 } from "lucide-react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGES } from "@/endpoints";
import AuthLayout from "@/pages/auth/layout";
import {
  forgotPassword,
  type MappedPasswordError,
} from "@/services/password-service";
import { AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setEmail(event.target.value);
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await forgotPassword(trimmedEmail);
      navigate(PAGES.RESET_PASSWORD);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as MappedPasswordError).message === "string"
      ) {
        setError((err as MappedPasswordError).message);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Could not send reset link.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password">
      <Card className="mx-auto w-full max-w-96 sm:w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link if an account
            exists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="user@whirlpool.in"
                autoComplete="email"
                required
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Could not send reset link</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  Send reset link
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="mt-4 text-center text-sm">
              <Link to={PAGES.LOGIN} className="underline ml-1">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
