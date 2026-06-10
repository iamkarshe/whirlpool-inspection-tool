import type { ChangeEvent, SubmitEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import type { PlantResponse } from "@/api/generated/model/plantResponse";
import type { PlantUpdateRequest } from "@/api/generated/model/plantUpdateRequest";
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
import { plantsApiErrorMessage, updatePlant } from "@/services/plants-api";

export type EditPlantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: PlantResponse | null;
  onSaved: () => void;
};

type PlantFormValues = {
  name: string;
  plant_code: string;
  address: string;
  lat: string;
  lng: string;
  city: string;
  postal_code: string;
  is_active: boolean;
};

function plantToFormValues(plant: PlantResponse): PlantFormValues {
  return {
    name: plant.name,
    plant_code: plant.plant_code,
    address: plant.address ?? "",
    lat: plant.lat != null ? String(plant.lat) : "",
    lng: plant.lng != null ? String(plant.lng) : "",
    city: plant.city,
    postal_code: plant.postal_code,
    is_active: plant.is_active,
  };
}

type EditPlantDialogFormProps = {
  plant: PlantResponse;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

function EditPlantDialogForm({
  plant,
  onOpenChange,
  onSaved,
}: EditPlantDialogFormProps) {
  const [formValues, setFormValues] = useState(() => plantToFormValues(plant));
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
    const payload: PlantUpdateRequest = {
      name: formValues.name.trim(),
      plant_code: formValues.plant_code.trim(),
      address: formValues.address.trim() || undefined,
      city: formValues.city.trim(),
      postal_code: Number(formValues.postal_code),
      lat: latTrimmed.length > 0 ? Number(latTrimmed) : null,
      lng: lngTrimmed.length > 0 ? Number(lngTrimmed) : null,
      is_active: formValues.is_active,
    };

    setSaving(true);
    try {
      await updatePlant(plant.uuid, payload);
      toast.success("Plant updated.");
      onOpenChange(false);
      onSaved();
    } catch (e: unknown) {
      setError(plantsApiErrorMessage(e, "Could not update plant."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="edit-plant-name">Name</Label>
        <Input
          id="edit-plant-name"
          name="name"
          value={formValues.name}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-plant-code">Plant code</Label>
        <Input
          id="edit-plant-code"
          name="plant_code"
          value={formValues.plant_code}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-plant-address">Address</Label>
        <Input
          id="edit-plant-address"
          name="address"
          value={formValues.address}
          onChange={handleInputChange}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-plant-lat">Latitude (optional)</Label>
          <Input
            id="edit-plant-lat"
            name="lat"
            type="number"
            step="any"
            value={formValues.lat}
            onChange={handleInputChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-plant-lng">Longitude (optional)</Label>
          <Input
            id="edit-plant-lng"
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
          <Label htmlFor="edit-plant-city">City</Label>
          <Input
            id="edit-plant-city"
            name="city"
            value={formValues.city}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-plant-postal-code">Postal code</Label>
          <Input
            id="edit-plant-postal-code"
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
          <Label htmlFor="edit-plant-active">Active</Label>
          <p className="text-muted-foreground text-sm">
            Inactive plants are hidden from operational flows.
          </p>
        </div>
        <Switch
          id="edit-plant-active"
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
          <AlertTitle>Plant will be disabled</AlertTitle>
          <AlertDescription>
            Setting active to off disables this plant from the system. Users and
            devices may no longer assign or use it until it is re-enabled.
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

export function EditPlantDialog({
  open,
  onOpenChange,
  plant,
  onSaved,
}: EditPlantDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit plant</DialogTitle>
          <DialogDescription>
            Update plant master data or disable it from the system.
          </DialogDescription>
        </DialogHeader>
        {plant ? (
          <EditPlantDialogForm
            key={plant.uuid}
            plant={plant}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
