import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditUserDialog } from "@/pages/dashboard/admin/users/edit-user-dialog";
import {
  UserDesignationBadge,
  UserRoleBadge,
  UserStatusBadge,
} from "@/pages/dashboard/admin/users/user-badge";
import type { UserViewContext } from "@/pages/dashboard/admin/users/user-view/context";
import { isSuperadminRoleName } from "@/services/users-api";
import { Pencil, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";

export default function UserViewDetailsPage() {
  const { user, reloadUser } = useOutletContext<UserViewContext>();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <UserIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </div>
          </div>
          {!isSuperadminRoleName(user.role) ?
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit user
            </Button>
          : null}
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
          <div className="space-y-1 sm:col-span-2">
            <p className="text-muted-foreground text-sm">Allowed warehouses</p>
            <p className="text-sm">
              {user.allowed_warehouse?.length ?
                user.allowed_warehouse.join(", ")
              : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {!isSuperadminRoleName(user.role) ?
        <EditUserDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={user}
          onSaved={() => void reloadUser()}
        />
      : null}
    </div>
  );
}
