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
import { EditUserDialog } from "@/pages/dashboard/admin/users/edit-user-dialog";
import UsersDataTable from "@/pages/dashboard/admin/users/data-table";
import { UserWarehouseSelect } from "@/pages/dashboard/admin/users/user-warehouse-select";
import {
  createUser,
  fetchUsersPage,
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
  allowed_warehouse_code: string;
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
    allowed_warehouse_code: "",
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
    const wh = formValues.allowed_warehouse_code.trim();
    const payload: UserCreateRequest = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      mobile_number: mobile,
      password: formValues.password,
      role: formValues.role || undefined,
      designation: formValues.designation.trim() || undefined,
      ...(wh ? { allowed_warehouse: [wh] } : {}),
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
        allowed_warehouse_code: "",
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
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
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
        label="Allowed Warehouse"
        value={formValues.allowed_warehouse_code}
        onValueChange={(allowed_warehouse_code) => {
          if (createError) setCreateError(null);
          setFormValues((previous) => ({
            ...previous,
            allowed_warehouse_code,
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
  const onEditUser = useCallback((u: UserResponse) => setEditUser(u), []);
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
    </div>
  );
}
