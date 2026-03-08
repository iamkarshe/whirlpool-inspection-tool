import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGES } from "@/endpoints";
import {
  getUserById,
  type User,
} from "@/pages/dashboard/admin/users/user-service";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function UserViewPage() {
  const params = useParams<{ id: string }>();
  const idParam = params.id ?? "";
  const id = parseInt(idParam, 10);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Number.isNaN(id)) {
      setUser(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUserById(id)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (Number.isNaN(id) || user === null || user === undefined) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" asChild>
          <Link to={PAGES.DASHBOARD_ADMIN_USERS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to users
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link
            to={PAGES.DASHBOARD_ADMIN_USERS}
            aria-label="Back to users"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-muted-foreground text-sm">
            {user.role} · {user.designation}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Email</p>
            <p className="text-sm">{user.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Mobile</p>
            <p className="text-sm">{user.mobile_number}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Role</p>
            <p className="text-sm">{user.role}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Designation</p>
            <p className="text-sm">{user.designation}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Status</p>
            <Badge variant={user.is_active ? "default" : "secondary"}>
              {user.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
