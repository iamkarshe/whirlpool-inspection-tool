import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { UserResponse } from "@/api/generated/model/userResponse";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserWarehouseSelect } from "@/pages/dashboard/admin/users/user-warehouse-select";
import {
  fetchAllWarehouses,
  warehouseApiErrorMessage,
} from "@/services/warehouses-api";
import { updateUser, userApiErrorMessage } from "@/services/users-api";
import { AlertCircle } from "lucide-react";

function isValidIndianMobile(value: string): boolean {
  return /^[5-9][0-9]{9}$/.test(value);
}

export type EditUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponse;
  onSaved: () => void;
};

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: EditUserDialogProps) {
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [loadWhError, setLoadWhError] = useState<string | null>(null);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile_number);
  const [designation, setDesignation] = useState(user.designation ?? "");
  const [role, setRole] = useState<"manager" | "operator">(
    user.role.trim().toLowerCase() === "manager" ? "manager" : "operator",
  );
  const [allowedWarehouseCode, setAllowedWarehouseCode] = useState(() => {
    const list = user.allowed_warehouse ?? [];
    if (list.length === 1) return list[0];
    return "";
  });
  const [isActive, setIsActive] = useState(user.is_active);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ambiguousWarehouseScope = useMemo(() => {
    const list = user.allowed_warehouse ?? [];
    return list.length > 1;
  }, [user.allowed_warehouse]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadWhError(null);
    fetchAllWarehouses()
      .then((rows) => {
        if (!cancelled) setWarehouses(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setLoadWhError(
            warehouseApiErrorMessage(e, "Could not load warehouses."),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setName(user.name);
    setEmail(user.email);
    setMobile(user.mobile_number);
    setDesignation(user.designation ?? "");
    setRole(
      user.role.trim().toLowerCase() === "manager" ? "manager" : "operator",
    );
    const list = user.allowed_warehouse ?? [];
    setAllowedWarehouseCode(list.length === 1 ? list[0] : "");
    setIsActive(user.is_active);
    setPassword("");
    setError(null);
  }, [open, user]);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setError(null);
    const mobileDigits = mobile.replace(/\D/g, "").slice(0, 10);
    if (!isValidIndianMobile(mobileDigits)) {
      setError(
        "Mobile number must be exactly 10 digits and start with 5–9.",
      );
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        email: email.trim(),
        mobile_number: mobileDigits,
        designation: designation.trim() || null,
        role,
        is_active: isActive,
        allowed_warehouse:
          allowedWarehouseCode.trim() ?
            [allowedWarehouseCode.trim()]
          : [],
      };
      const pwd = password.trim();
      await updateUser(user.uuid, {
        ...body,
        ...(pwd ? { password: pwd } : {}),
      });
      toast.success("User updated.");
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      setError(userApiErrorMessage(e, "Could not update user."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update profile, role, warehouse scope, or set a new password.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-mobile">Mobile number</Label>
            <Input
              id="edit-mobile"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                setMobile(digits);
              }}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as typeof role)}
              >
                <SelectTrigger id="edit-role" className="w-full">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-designation">Designation</Label>
              <Input
                id="edit-designation"
                value={designation}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDesignation(e.target.value)
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-status">Account status</Label>
            <Select
              value={isActive ? "active" : "inactive"}
              onValueChange={(v) => setIsActive(v === "active")}
            >
              <SelectTrigger id="edit-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loadWhError ? (
            <p className="text-destructive text-sm">{loadWhError}</p>
          ) : null}
          {ambiguousWarehouseScope ? (
            <p className="text-muted-foreground text-xs">
              This user has multiple allowed warehouse codes. Pick one scope
              below to replace the list, or choose None to clear all.
            </p>
          ) : null}
          <UserWarehouseSelect
            id="edit-warehouse"
            label="Allowed Warehouse"
            value={allowedWarehouseCode}
            onValueChange={setAllowedWarehouseCode}
            warehouses={warehouses}
            disabled={Boolean(loadWhError)}
          />
          <div className="space-y-2">
            <Label htmlFor="edit-password">New password (optional)</Label>
            <Input
              id="edit-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
              placeholder="Leave blank to keep current password"
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
