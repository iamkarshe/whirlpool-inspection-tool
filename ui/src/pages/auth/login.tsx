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
import type { SubmitEvent } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_EMAIL : "",
  );
  const [password, setPassword] = useState(
    import.meta.env.DEV ? import.meta.env.VITE_DEFAULT_PASSWORD : "",
  );

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (password !== "password") {
      toast.error("Invalid password");
      return;
    }

    if (email === "ops@whirlpool.com") {
      navigate(PAGES.OPS_HOME);
      return;
    }

    if (email === "admin@whirlpool.com") {
      navigate(PAGES.DASHBOARD);
      return;
    }

    toast.error("Invalid email or password");
    return;
  };

  return (
    <AuthLayout title="Login">
      <Card className="mx-auto w-96">
        <CardHeader>
          <img src="/logo.svg" alt="Whirlpool" />
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="user@whirlpool.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  to={PAGES.FORGOT_PASSWORD}
                  className="ml-auto inline-block text-sm underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>

            <div className="my-4">
              <div className="flex items-center gap-3">
                <div className="w-full border-t" />
                <span className="text-muted-foreground shrink-0 text-sm">
                  or continue with
                </span>
                <div className="w-full border-t" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" className="w-full" type="button">
                Okta SSO Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
