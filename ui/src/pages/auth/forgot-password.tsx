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
import { ArrowRightIcon } from "lucide-react";
import type { SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleSubmit = (ev: SubmitEvent) => {
    ev.preventDefault();
    navigate(PAGES.RESET_PASSWORD);
  };

  return (
    <AuthLayout title="Forgot Password">
      <Card className="mx-auto w-96">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@whirlpool.com"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Send Reset Link
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>

            <div className="mt-4 text-center text-sm">
              <Link to={PAGES.LOGIN} className="underline ml-1">
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
