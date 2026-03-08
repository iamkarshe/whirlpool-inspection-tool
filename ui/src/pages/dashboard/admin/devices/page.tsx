import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import DevicesDataTable from "@/pages/dashboard/admin/devices/data-table";
import {
  getDevices,
  type Device,
  type DeviceType,
} from "@/pages/dashboard/admin/devices/device-service";
import { getUsers, type User } from "@/pages/dashboard/admin/users/user-service";
import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useState } from "react";

type DeviceFormValues = {
  user_id: number;
  imei: string;
  device_type: DeviceType;
  device_fingerprint: string;
  device_info: string;
  is_locked: boolean;
};

export default function DevicesPage() {
  const [formValues, setFormValues] = useState<DeviceFormValues>({
    user_id: 0,
    imei: "",
    device_type: "mobile",
    device_fingerprint: "",
    device_info: "",
    is_locked: false,
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDevicesAndUsers = async () => {
      try {
        const [devicesData, usersData] = await Promise.all([
          getDevices(),
          getUsers(),
        ]);
        setDevices(devicesData);
        setUsers(usersData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevicesAndUsers();
  }, []);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = event.target;
    const checked =
      event.target instanceof HTMLInputElement
        ? event.target.checked
        : undefined;
    setFormValues((previous) => ({
      ...previous,
      [name]:
        type === "checkbox" && checked !== undefined ? checked : value,
    }));
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    console.log("Mock create device", formValues);
  };

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Devices"
        description="Manage registered devices and assignments."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <span className="mr-1">+</span>
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add device</DialogTitle>
              <DialogDescription>
                Register a new device and assign it to a user.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="user_id">User</Label>
                <Select
                  value={
                    formValues.user_id ? String(formValues.user_id) : ""
                  }
                  onValueChange={(value) =>
                    setFormValues((previous) => ({
                      ...previous,
                      user_id: value ? Number(value) : 0,
                    }))
                  }
                >
                  <SelectTrigger id="user_id" className="w-full">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imei">IMEI</Label>
                <Input
                  id="imei"
                  name="imei"
                  value={formValues.imei}
                  onChange={handleInputChange}
                  placeholder="N/A for desktop"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device_type">Device type</Label>
                <Select
                  value={formValues.device_type}
                  onValueChange={(value: DeviceType) =>
                    setFormValues((previous) => ({
                      ...previous,
                      device_type: value,
                    }))
                  }
                >
                  <SelectTrigger id="device_type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="device_fingerprint">Device fingerprint</Label>
                <Input
                  id="device_fingerprint"
                  name="device_fingerprint"
                  value={formValues.device_fingerprint}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="device_info">Device info (optional)</Label>
                <Textarea
                  id="device_info"
                  name="device_info"
                  value={formValues.device_info}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="e.g. Android 14, Samsung Galaxy"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_locked"
                  name="is_locked"
                  checked={formValues.is_locked}
                  onCheckedChange={(checked) =>
                    setFormValues((previous) => ({
                      ...previous,
                      is_locked: checked === true,
                    }))
                  }
                />
                <Label htmlFor="is_locked" className="text-sm font-normal">
                  Lock device
                </Label>
              </div>
              <DialogFooter>
                <Button type="submit">Save device</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageActionBar>
      {isLoading ? (
        <SkeletonTable />
      ) : (
        <DevicesDataTable data={devices} />
      )}
    </div>
  );
}
