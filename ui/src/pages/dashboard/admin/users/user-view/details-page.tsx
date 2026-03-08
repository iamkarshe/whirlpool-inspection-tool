import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserDesignationBadge,
  UserRoleBadge,
  UserStatusBadge,
} from "@/pages/dashboard/admin/users/user-badge";
import type { User } from "@/pages/dashboard/admin/users/user-service";
import { User as UserIcon } from "lucide-react";
import { useOutletContext } from "react-router-dom";

type UserViewContext = { user: User };

export default function UserViewDetailsPage() {
  const { user } = useOutletContext<UserViewContext>();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <UserIcon className="h-6 w-6 text-muted-foreground" />
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
          <UserRoleBadge role={user.role} />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Designation</p>
          <UserDesignationBadge designation={user.designation} />
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Status</p>
          <UserStatusBadge isActive={user.is_active} />
        </div>
      </CardContent>
    </Card>
  );
}
