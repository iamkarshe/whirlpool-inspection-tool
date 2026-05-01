import type { ChangeEvent, SubmitEvent } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type {
  UserCreateRequest,
  UserCreateRequestRole,
} from "@/api/generated/model";
import type { UserResponse } from "@/api/generated/model/userResponse";
import { CreateEntryDialog } from "@/components/dialogs/create-entry-dialog";
import PageActionBar from "@/components/page-action-bar";
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
import UsersDataTable from "@/pages/dashboard/admin/users/data-table";
import {
  createUser,
  fetchUsersPage,
  userApiErrorMessage,
} from "@/services/users-api";

type UserFormValues = {
  name: string;
  email: string;
  mobile_number: string;
  password: string;
  role: UserCreateRequestRole | "";
  designation: string;
};

const USER_LIST_SORT = {
  allowedColumns: ["id", "name", "email", "mobile_number"] as const,
  defaultSort: { sort_by: "id", sort_dir: "desc" as const },
};

export default function UsersPage() {
  const [formValues, setFormValues] = useState<UserFormValues>({
    name: "",
    email: "",
    mobile_number: "",
    password: "",
    role: "",
    designation: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const payload: UserCreateRequest = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      mobile_number: formValues.mobile_number.trim(),
      password: formValues.password,
      role: formValues.role || undefined,
      designation: formValues.designation.trim() || undefined,
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
      });
      setReloadKey((v) => v + 1);
    } catch (e: unknown) {
      toast.error(userApiErrorMessage(e, "Could not create user."));
      throw e;
    } finally {
      setIsCreating(false);
    }
  };

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
        >
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
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formValues.role}
                onValueChange={(value) =>
                  setFormValues((previous) => ({
                    ...previous,
                    role: value as UserCreateRequestRole,
                  }))
                }
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
            <DialogFooter>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : "Save user"}
              </Button>
            </DialogFooter>
          </form>
        </CreateEntryDialog>
      </PageActionBar>
      {error && !isLoading ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}
      <UsersDataTable
        data={rows}
        serverSide={serverSideWithFilters}
        isLoading={isLoading}
      />
    </div>
  );
}
