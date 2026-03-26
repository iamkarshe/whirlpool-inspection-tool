import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import { CreateEntryDialog } from "@/components/dialogs/create-entry-dialog";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UsersDataTable from "@/pages/dashboard/admin/users/data-table";
import {
  getRoles,
  type Role,
} from "@/pages/dashboard/admin/users/role-service";
import {
  getUsers,
  type User,
} from "@/pages/dashboard/admin/users/user-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useState } from "react";

type UserFormValues = {
  name: string;
  email: string;
  mobile_number: string;
  role_id: number;
  designation: string;
};

export default function UsersPage() {
  const [formValues, setFormValues] = useState<UserFormValues>({
    name: "",
    email: "",
    mobile_number: "",
    role_id: 0,
    designation: "",
  });

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    const fetchUsersAndRoles = async () => {
      try {
        const [usersData, rolesData] = await Promise.all([
          getUsers() as Promise<User[]>,
          getRoles() as Promise<Role[]>,
        ]);
        setUsers(usersData);
        setRoles(rolesData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsersAndRoles();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    console.log("Mock create user", formValues);
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
              <Label htmlFor="role">Role</Label>
              <Select
                value={formValues.role_id ? String(formValues.role_id) : ""}
                onValueChange={(value) =>
                  setFormValues((previous) => ({
                    ...previous,
                    role_id: value ? Number(value) : 0,
                  }))
                }
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.role.charAt(0).toUpperCase() + r.role.slice(1)}
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
            <DialogFooter>
              <Button type="submit">Save user</Button>
            </DialogFooter>
          </form>
        </CreateEntryDialog>
      </PageActionBar>
      {isLoading ? <SkeletonTable /> : <UsersDataTable data={users} />}
    </div>
  );
}
