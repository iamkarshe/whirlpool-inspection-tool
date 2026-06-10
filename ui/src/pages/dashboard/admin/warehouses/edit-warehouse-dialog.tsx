import type { ChangeEvent, SubmitEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import type { WarehouseUpdateRequest } from "@/api/generated/model/warehouseUpdateRequest";
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
import { Switch } from "@/components/ui/switch";
import {
  updateWarehouse,
  warehouseApiErrorMessage,
} from "@/services/warehouses-api";

export type EditWarehouseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: WarehouseResponse | null;
  onSaved: () => void;
};

type WarehouseFormValues = {
  name: string;
  warehouse_code: string;
  address: string;
  lat: string;
  lng: string;
  city: string;
  postal_code: string;
  is_active: boolean;
};

function warehouseToFormValues(warehouse: WarehouseResponse): WarehouseFormValues {
  return {
    name: warehouse.name,
    warehouse_code: warehouse.warehouse_code,
    address: warehouse.address ?? "",
    lat: warehouse.lat != null ? String(warehouse.lat) : "",
    lng: warehouse.lng != null ? String(warehouse.lng) : "",
    city: warehouse.city,
    postal_code: warehouse.postal_code,
    is_active: warehouse.is_active,
  };
}

type EditWarehouseDialogFormProps = {
  warehouse: WarehouseResponse;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function EditWarehouseDialogForm({
  warehouse,
  onOpenChange,
  onSaved,
}: EditWarehouseDialogFormProps) {
  const [formValues, setFormValues] = useState(() =>
    warehouseToFormValues(warehouse),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    setError(null);
    const latTrimmed = formValues.lat.trim();
    const lngTrimmed = formValues.lng.trim();
    const payload: WarehouseUpdateRequest = {
      name: formValues.name.trim(),
      warehouse_code: formValues.warehouse_code.trim(),
      address: formValues.address.trim() || undefined,
      city: formValues.city.trim(),
      postal_code: Number(formValues.postal_code),
      lat: latTrimmed.length > 0 ? Number(latTrimmed) : null,
      lng: lngTrimmed.length > 0 ? Number(lngTrimmed) : null,
      is_active: formValues.is_active,
    };

    setSaving(true);
    try {
      await updateWarehouse(warehouse.uuid, payload);
      toast.success("Warehouse updated.");
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      setError(warehouseApiErrorMessage(e, "Could not update warehouse."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="edit-warehouse-name">Name</Label>
        <Input
          id="edit-warehouse-name"
          name="name"
          value={formValues.name}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-warehouse-code">Warehouse code</Label>
        <Input
          id="edit-warehouse-code"
          name="warehouse_code"
          value={formValues.warehouse_code}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-warehouse-address">Address</Label>
        <Input
          id="edit-warehouse-address"
          name="address"
          value={formValues.address}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-warehouse-lat">Latitude (optional)</Label>
          <Input
            id="edit-warehouse-lat"
            name="lat"
            type="number"
            step="any"
            value={formValues.lat}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-warehouse-lng">Longitude (optional)</Label>
          <Input
            id="edit-warehouse-lng"
            name="lng"
            type="number"
            step="any"
            value={formValues.lng}
            onChange={handleInputChange}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-warehouse-city">City</Label>
          <Input
            id="edit-warehouse-city"
            name="city"
            value={formValues.city}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-warehouse-postal-code">Postal code</Label>
          <Input
            id="edit-warehouse-postal-code"
            name="postal_code"
            type="number"
            min={0}
            value={formValues.postal_code}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="edit-warehouse-active">Active</Label>
          <p className="text-muted-foreground text-sm">
            Inactive warehouses are hidden from operational flows.
          </p>
        </div>
        <Switch
          id="edit-warehouse-active"
          checked={formValues.is_active}
          onCheckedChange={(checked) =>
            setFormValues((previous) => ({
              ...previous,
              is_active: checked,
            }))
          }
        />
      </div>
      {!formValues.is_active ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warehouse will be disabled</AlertTitle>
          <AlertDescription>
            Setting active to off disables this warehouse from the system. Users
            and devices may no longer assign or use it until it is re-enabled.
          </AlertDescription>
        </Alert>
      ) : null}
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
  );
}

export function EditWarehouseDialog({
  open,
  onOpenChange,
  warehouse,
  onSaved,
}: EditWarehouseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit warehouse</DialogTitle>
          <DialogDescription>
            Update warehouse master data or disable it from the system.
          </DialogDescription>
        </DialogHeader>
        {warehouse ? (
          <EditWarehouseDialogForm
            key={warehouse.uuid}
            warehouse={warehouse}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
