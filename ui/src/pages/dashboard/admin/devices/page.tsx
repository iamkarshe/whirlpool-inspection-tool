import KpiLoader from "@/components/kpi-loader";
import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateEntryDialog } from "@/components/dialogs/create-entry-dialog";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import { DeviceStatCards } from "@/pages/dashboard/admin/devices/components/device-stat-cards";
import DevicesDataTable from "@/pages/dashboard/admin/devices/data-table";
import {
  type Device,
  type DeviceKpis,
  type DeviceType,
} from "@/pages/dashboard/admin/devices/device-service";
import type { UserResponse } from "@/api/generated/model/userResponse";
import {
  deviceApiErrorMessage,
  fetchDeviceKpis,
  fetchDevicesPage,
} from "@/services/devices-api";
import { fetchAllUsers } from "@/services/users-api";
import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

  const [kpis, setKpis] = useState<DeviceKpis | null>(null);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [apiFilters, setApiFilters] = useState<Record<string, string>>({
    is_active: "",
  });

  useEffect(() => {
    setLoadingKpis(true);
    fetchDeviceKpis()
      .then(setKpis)
      .finally(() => setLoadingKpis(false));
  }, []);

  useEffect(() => {
    fetchAllUsers().then(setUsers);
  }, []);

  const DEVICE_LIST_SORT = {
    allowedColumns: [
      "id",
      "user_name",
      "imei",
      "device_type",
      "updated_at",
    ] as const,
    defaultSort: { sort_by: "id", sort_dir: "desc" as const },
  };
  const { rows: devices, isLoading, error, serverSide } =
    useControlledServerTable<Device>({
      initialSorting: [{ id: "id", desc: true }],
      refreshKey: reloadKey,
      dataScopeKey: apiFilters.is_active,
      errorMessage: "Failed to load devices.",
      load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
        const { sort_by, sort_dir } = sortingStateToApiSortQuery(
          s,
          DEVICE_LIST_SORT,
        );
        return fetchDevicesPage(
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
          },
          { signal },
        );
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
      [name]: type === "checkbox" && checked !== undefined ? checked : value,
    }));
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    toast.info("Create device API is not available in the client yet.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageActionBar
          title="Devices"
          description="Manage registered devices and view activity for the selected period."
        />
        <div className="flex flex-wrap items-center gap-2">
          <CreateEntryDialog
            triggerLabel="Add Device"
            title="Add device"
            description="Register a new device and assign it to a user."
          >
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="user_id">User</Label>
                <Select
                  value={formValues.user_id ? String(formValues.user_id) : ""}
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
          </CreateEntryDialog>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          {loadingKpis ? (
            <KpiLoader count={4} />
          ) : kpis ? (
            <DeviceStatCards kpis={kpis} />
          ) : null}
        </div>

        <div className="lg:col-span-12">
          {error && !isLoading ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          <DevicesDataTable
            data={devices}
            serverSide={serverSideWithFilters}
            isLoading={isLoading}
            onRefresh={() => setReloadKey((v) => v + 1)}
            onActionError={(message) => toast.error(message)}
          />
        </div>
      </div>
    </div>
  );
}
