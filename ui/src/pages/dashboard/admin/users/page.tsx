import type { ChangeEvent, SubmitEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  UserCreateRequest,
  UserCreateRequestRole,
} from "@/api/generated/model";
import type { UserResponse } from "@/api/generated/model/userResponse";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import { CreateEntryDialog } from "@/components/dialogs/create-entry-dialog";
import PageActionBar from "@/components/page-action-bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import { DeactivateUserDialog } from "@/pages/dashboard/admin/users/deactivate-user-dialog";
import { EditUserDialog } from "@/pages/dashboard/admin/users/edit-user-dialog";
import UsersDataTable from "@/pages/dashboard/admin/users/data-table";
import { RevokeUserVpnDialog } from "@/pages/dashboard/admin/users/revoke-user-vpn-dialog";
import { VpnInstallationDialog } from "@/pages/dashboard/admin/users/vpn-installation-dialog";
import {
  openVpnSetupMailto,
  vpnConfigFilenameForUser,
  vpnQrFilenameForUser,
} from "@/pages/dashboard/admin/users/vpn-instructions";
import { ASSIGNABLE_USER_ROLES } from "@/pages/dashboard/admin/users/user-form-roles";
import { UserWarehouseSelect } from "@/pages/dashboard/admin/users/user-warehouse-select";
import {
  createUser,
  downloadUserVpnConfig,
  downloadUserVpnQr,
  fetchUsersPage,
  generateUserVpn,
  revokeUserVpn,
  updateUser,
  userApiErrorMessage,
} from "@/services/users-api";
import {
  fetchAllWarehouses,
  warehouseApiErrorMessage,
} from "@/services/warehouses-api";
import { AlertCircle } from "lucide-react";

type UserFormValues = {
  name: string;
  email: string;
  mobile_number: string;
  password: string;
  role: UserCreateRequestRole | "";
  designation: string;
  allowed_warehouse_codes: string[];
};

const USER_LIST_SORT = {
  allowedColumns: ["id", "name", "email", "mobile_number"] as const,
  defaultSort: { sort_by: "id", sort_dir: "desc" as const },
};

function isValidIndianMobile(value: string): boolean {
  return /^[5-9][0-9]{9}$/.test(value);
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const [formValues, setFormValues] = useState<UserFormValues>({
    name: "",
    email: "",
    mobile_number: "",
    password: "",
    role: "",
    designation: "",
    allowed_warehouse_codes: [],
  });
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [warehousesError, setWarehousesError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllWarehouses()
      .then((rows) => {
        if (!cancelled) setWarehouses(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setWarehousesError(
            warehouseApiErrorMessage(e, "Could not load warehouses."),
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (createError) setCreateError(null);
    if (name === "mobile_number") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setFormValues((previous) => ({ ...previous, mobile_number: digits }));
      return;
    }
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    setCreateError(null);
    const mobile = formValues.mobile_number.trim();
    if (!isValidIndianMobile(mobile)) {
      setCreateError(
        "Mobile number must be exactly 10 digits and start with 5.",
      );
      return;
    }
    const payload: UserCreateRequest = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      mobile_number: mobile,
      password: formValues.password,
      role: formValues.role || undefined,
      designation: formValues.designation.trim() || undefined,
      ...(formValues.allowed_warehouse_codes.length > 0 ?
        { allowed_warehouse: formValues.allowed_warehouse_codes }
      : {}),
    };
    setIsCreating(true);
    try {
      await createUser(payload);
      toast.success("User created.");
      setFormValues({
        name: "",
        email: "",
        mobile_number: "",
        password: "",
        role: "",
        designation: "",
        allowed_warehouse_codes: [],
      });
      onCreated();
    } catch (e: unknown) {
      setCreateError(userApiErrorMessage(e, "Could not create user."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={formValues.name}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formValues.email}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mobile_number">Mobile number</Label>
        <Input
          id="mobile_number"
          name="mobile_number"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          pattern="^[5-9][0-9]{9}$"
          value={formValues.mobile_number}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          value={formValues.password}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            value={formValues.role}
            onValueChange={(value) => {
              if (createError) setCreateError(null);
              setFormValues((previous) => ({
                ...previous,
                role: value as UserCreateRequestRole,
              }));
            }}
          >
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_USER_ROLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input
            id="designation"
            name="designation"
            value={formValues.designation}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      {warehousesError ? (
        <p className="text-destructive text-sm">{warehousesError}</p>
      ) : null}
      <UserWarehouseSelect
        id="create-warehouse"
        label="Allowed warehouses"
        value={formValues.allowed_warehouse_codes}
        onValueChange={(allowed_warehouse_codes) => {
          if (createError) setCreateError(null);
          setFormValues((previous) => ({
            ...previous,
            allowed_warehouse_codes,
          }));
        }}
        warehouses={warehouses}
        disabled={Boolean(warehousesError)}
      />
      {createError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not create user</AlertTitle>
          <AlertDescription>{createError}</AlertDescription>
        </Alert>
      ) : null}
      <DialogFooter>
        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Saving..." : "Save user"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function UsersPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserResponse | null>(null);
  const [togglingUserUuid, setTogglingUserUuid] = useState<string | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserResponse | null>(null);
  const [vpnInstallUser, setVpnInstallUser] = useState<UserResponse | null>(null);
  const [revokeVpnUser, setRevokeVpnUser] = useState<UserResponse | null>(null);
  const [vpnBusyUserUuid, setVpnBusyUserUuid] = useState<string | null>(null);
  const [vpnBusyAction, setVpnBusyAction] = useState<
    "setup" | "config" | "qr" | "revoke" | "email" | null
  >(null);
  const onEditUser = useCallback((u: UserResponse) => setEditUser(u), []);

  const applyUserActiveState = useCallback(
    async (user: UserResponse, isActive: boolean): Promise<boolean> => {
      setTogglingUserUuid(user.uuid);
      try {
        await updateUser(user.uuid, { is_active: isActive });
        toast.success(isActive ? "User activated." : "User deactivated.");
        setReloadKey((v) => v + 1);
        setDeactivateUser(null);
        return true;
      } catch (e: unknown) {
        toast.error(
          userApiErrorMessage(
            e,
            isActive ?
              "Could not activate user."
            : "Could not deactivate user.",
          ),
        );
        return false;
      } finally {
        setTogglingUserUuid(null);
      }
    },
    [],
  );

  const onToggleUserActive = useCallback(
    (user: UserResponse) => {
      if (user.is_active) {
        setDeactivateUser(user);
        return;
      }
      void applyUserActiveState(user, true);
    },
    [applyUserActiveState],
  );

  const runVpnDownload = useCallback(
    async (user: UserResponse, kind: "config" | "qr") => {
      setVpnBusyUserUuid(user.uuid);
      setVpnBusyAction(kind);
      try {
        if (kind === "config") {
          await downloadUserVpnConfig(user);
          toast.success("VPN config downloaded.");
        } else {
          await downloadUserVpnQr(user);
          toast.success("VPN QR code downloaded.");
        }
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Download failed.");
      } finally {
        setVpnBusyUserUuid(null);
        setVpnBusyAction(null);
      }
    },
    [],
  );

  const onVpnSetup = useCallback(async (user: UserResponse) => {
    setVpnBusyUserUuid(user.uuid);
    setVpnBusyAction("setup");
    try {
      const updated = await generateUserVpn(user.uuid, {
        deviceName: user.name,
      });
      toast.success("VPN profile created.");
      setReloadKey((v) => v + 1);
      setVpnInstallUser(updated);
    } catch (e: unknown) {
      toast.error(userApiErrorMessage(e, "Could not provision VPN."));
    } finally {
      setVpnBusyUserUuid(null);
      setVpnBusyAction(null);
    }
  }, []);

  const onVpnDownloadConfig = useCallback(
    (user: UserResponse) => void runVpnDownload(user, "config"),
    [runVpnDownload],
  );

  const onVpnDownloadQr = useCallback(
    (user: UserResponse) => void runVpnDownload(user, "qr"),
    [runVpnDownload],
  );

  const onVpnRevoke = useCallback((user: UserResponse) => {
    setRevokeVpnUser(user);
  }, []);

  const onVpnShowInstructions = useCallback((user: UserResponse) => {
    setVpnInstallUser(user);
  }, []);

  const sendVpnInstructionsEmail = useCallback(async (user: UserResponse) => {
    setVpnBusyUserUuid(user.uuid);
    setVpnBusyAction("email");
    try {
      await downloadUserVpnConfig(user);
      await downloadUserVpnQr(user);
      openVpnSetupMailto(user);
      toast.info(
        `Config and QR downloaded. Your default mail app will open — attach ${vpnConfigFilenameForUser(user)} and ${vpnQrFilenameForUser(user)} before sending.`,
        { duration: 8000 },
      );
    } catch (e: unknown) {
      toast.error(
        e instanceof Error ?
          e.message
        : "Could not prepare VPN files for email.",
      );
    } finally {
      setVpnBusyUserUuid(null);
      setVpnBusyAction(null);
    }
  }, []);

  const applyVpnRevoke = useCallback(
    async (user: UserResponse): Promise<boolean> => {
      setVpnBusyUserUuid(user.uuid);
      setVpnBusyAction("revoke");
      try {
        await revokeUserVpn(user.uuid);
        toast.success("VPN profile revoked.");
        setReloadKey((v) => v + 1);
        setRevokeVpnUser(null);
        if (vpnInstallUser?.uuid === user.uuid) setVpnInstallUser(null);
        return true;
      } catch (e: unknown) {
        toast.error(userApiErrorMessage(e, "Could not revoke VPN profile."));
        return false;
      } finally {
        setVpnBusyUserUuid(null);
        setVpnBusyAction(null);
      }
    },
    [vpnInstallUser],
  );

  const handleInstallDialogDownloadConfig = useCallback(async () => {
    if (!vpnInstallUser) return;
    await runVpnDownload(vpnInstallUser, "config");
  }, [runVpnDownload, vpnInstallUser]);

  const handleInstallDialogDownloadQr = useCallback(async () => {
    if (!vpnInstallUser) return;
    await runVpnDownload(vpnInstallUser, "qr");
  }, [runVpnDownload, vpnInstallUser]);
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({
    is_active: "",
    role: "",
  });

  const { rows, isLoading, error, serverSide } =
    useControlledServerTable<UserResponse>({
      initialSorting: [{ id: "id", desc: true }],
      refreshKey: reloadKey,
      dataScopeKey: `${apiFilters.is_active}|${apiFilters.role}`,
      errorMessage: "Failed to load users.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          USER_LIST_SORT,
        );
        const res = await fetchUsersPage(
          {
            page: p.pageIndex + 1,
            per_page: p.pageSize,
            search: q.length > 0 ? q : null,
            sort_by,
            sort_dir,
            is_active:
              apiFilters.is_active === "true"
                ? true
                : apiFilters.is_active === "false"
                  ? false
                  : undefined,
            role: apiFilters.role || null,
          },
          { signal },
        );
        return { data: res.data, total: res.total };
      },
    });
  const serverSideWithFilters = useMemo(
    () => ({
      ...serverSide,
      filters: apiFilters,
      onFilterChange: (id: string, value: string) => {
        setApiFilters((prev) => ({ ...prev, [id]: value }));
        serverSide.onPaginationChange({
          ...serverSide.pagination,
          pageIndex: 0,
        });
      },
    }),
    [apiFilters, serverSide],
  );

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Users"
        description="Manage user accounts and roles."
      >
        <CreateEntryDialog
          triggerLabel="Add User"
          title="Add user"
          description="Create a new user for the system."
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        >
          <CreateUserForm
            onCreated={() => {
              setReloadKey((v) => v + 1);
              setCreateDialogOpen(false);
            }}
          />
        </CreateEntryDialog>
      </PageActionBar>
      {error && !isLoading ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}
      <UsersDataTable
        data={rows}
        serverSide={serverSideWithFilters}
        isLoading={isLoading}
        onEditUser={onEditUser}
        onToggleUserActive={onToggleUserActive}
        togglingUserUuid={togglingUserUuid}
        onVpnSetup={onVpnSetup}
        onVpnDownloadConfig={onVpnDownloadConfig}
        onVpnDownloadQr={onVpnDownloadQr}
        onVpnRevoke={onVpnRevoke}
        onVpnShowInstructions={onVpnShowInstructions}
        vpnBusyUserUuid={vpnBusyUserUuid}
        vpnBusyAction={vpnBusyAction}
      />
      {editUser ?
        <EditUserDialog
          key={editUser.uuid}
          open
          onOpenChange={(open) => {
            if (!open) setEditUser(null);
          }}
          user={editUser}
          onSaved={() => {
            setReloadKey((v) => v + 1);
            setEditUser(null);
          }}
        />
      : null}
      <DeactivateUserDialog
        open={deactivateUser !== null}
        onOpenChange={(open) => {
          if (!open) setDeactivateUser(null);
        }}
        user={deactivateUser}
        isLoading={
          deactivateUser !== null && togglingUserUuid === deactivateUser.uuid
        }
        onConfirm={() =>
          deactivateUser ?
            applyUserActiveState(deactivateUser, false)
          : Promise.resolve(false)
        }
      />
      <VpnInstallationDialog
        open={vpnInstallUser !== null}
        onOpenChange={(open) => {
          if (!open) setVpnInstallUser(null);
        }}
        user={vpnInstallUser}
        downloading={
          vpnInstallUser && vpnBusyUserUuid === vpnInstallUser.uuid ?
            vpnBusyAction === "config" || vpnBusyAction === "qr" ?
              vpnBusyAction
            : null
          : null
        }
        onDownloadConfig={handleInstallDialogDownloadConfig}
        onDownloadQr={handleInstallDialogDownloadQr}
        onSendEmail={() =>
          vpnInstallUser ?
            sendVpnInstructionsEmail(vpnInstallUser)
          : undefined
        }
        sendingEmail={
          vpnInstallUser !== null &&
          vpnBusyUserUuid === vpnInstallUser.uuid &&
          vpnBusyAction === "email"
        }
      />
      <RevokeUserVpnDialog
        open={revokeVpnUser !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeVpnUser(null);
        }}
        user={revokeVpnUser}
        isLoading={
          revokeVpnUser !== null && vpnBusyUserUuid === revokeVpnUser.uuid
        }
        onConfirm={() =>
          revokeVpnUser ?
            applyVpnRevoke(revokeVpnUser)
          : Promise.resolve(false)
        }
      />
    </div>
  );
}
