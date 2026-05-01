import type { ChangeEvent, SubmitEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";

import type { WarehouseCreateRequest } from "@/api/generated/model/warehouseCreateRequest";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import CsvUploadDialog from "@/components/csv-upload-dialog";
import { CreateEntryDialog } from "@/components/dialogs/create-entry-dialog";
import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import { sortingStateToApiSortQuery } from "@/components/ui/data-table-server";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useControlledServerTable } from "@/hooks/use-controlled-server-table";
import {
  createWarehouse,
  fetchWarehousesPage,
  uploadWarehousesCsv,
  warehouseApiErrorMessage,
} from "@/services/warehouses-api";
import WarehousesDataTable from "./data-table";

type WarehouseFormValues = {
  name: string;
  warehouse_code: string;
  address: string;
  lat: string;
  lng: string;
  city: string;
  postal_code: string;
};

const WAREHOUSE_LIST_SORT = {
  allowedColumns: [
    "id",
    "name",
    "warehouse_code",
    "created_at",
    "updated_at",
  ] as const,
  defaultSort: { sort_by: "id", sort_dir: "desc" as const },
};

export default function WarehousesPage() {
  const [formValues, setFormValues] = useState<WarehouseFormValues>({
    name: "",
    warehouse_code: "",
    address: "",
    lat: "",
    lng: "",
    city: "",
    postal_code: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const {
    rows: warehouses,
    isLoading,
    error,
    serverSide,
  } = useControlledServerTable<WarehouseResponse>({
    initialSorting: [{ id: "id", desc: true }],
    refreshKey: reloadKey,
    errorMessage: "Failed to load warehouses.",
    load: async ({ signal, pagination: p, searchQuery: q, sorting: s }) => {
      const { sort_by, sort_dir } = sortingStateToApiSortQuery(s, WAREHOUSE_LIST_SORT);
      const res = await fetchWarehousesPage(
        {
          page: p.pageIndex + 1,
          per_page: p.pageSize,
          search: q.length > 0 ? q : null,
          sort_by,
          sort_dir,
        },
        { signal },
      );
      return { data: res.data, total: res.total };
    },
  });

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const payload: WarehouseCreateRequest = {
      name: formValues.name.trim(),
      warehouse_code: formValues.warehouse_code.trim(),
      address: formValues.address.trim(),
      city: formValues.city.trim(),
      lat: Number(formValues.lat),
      lng: Number(formValues.lng),
      postal_code: Number(formValues.postal_code),
    };
    setIsCreating(true);
    try {
      await createWarehouse(payload);
      toast.success("Warehouse created.");
      setFormValues({
        name: "",
        warehouse_code: "",
        address: "",
        lat: "",
        lng: "",
        city: "",
        postal_code: "",
      });
      setReloadKey((v) => v + 1);
    } catch (e: unknown) {
      toast.error(warehouseApiErrorMessage(e, "Could not create warehouse."));
      throw e;
    } finally {
      setIsCreating(false);
    }
  };

  const handleCsvSubmit = async (file: File) => {
    try {
      await uploadWarehousesCsv(file);
      toast.success("Warehouses CSV uploaded.");
      setReloadKey((v) => v + 1);
    } catch (e: unknown) {
      toast.error(warehouseApiErrorMessage(e, "Could not upload the CSV."));
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Warehouses"
        description="Manage master data for all warehouses."
      >
        <CsvUploadDialog
          title="Upload Warehouses"
          description="Select a CSV file containing warehouses to import."
          templateFilename="warehouses-template.csv"
          templateDownloadUrl="/api/warehouses/csv/template"
          onSubmit={handleCsvSubmit}
        />

        <CreateEntryDialog
          triggerLabel="Add Warehouse"
          title="Add warehouse"
          description="Create a new warehouse location."
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
              <Label htmlFor="warehouse_code">Warehouse code</Label>
              <Input
                id="warehouse_code"
                name="warehouse_code"
                value={formValues.warehouse_code}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formValues.address}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude (optional)</Label>
                <Input
                  id="lat"
                  name="lat"
                  type="number"
                  step="any"
                  placeholder="e.g. 18.5204"
                  value={formValues.lat}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude (optional)</Label>
                <Input
                  id="lng"
                  name="lng"
                  type="number"
                  step="any"
                  placeholder="e.g. 73.8567"
                  value={formValues.lng}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formValues.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal code</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  type="number"
                  min={0}
                  value={formValues.postal_code}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : "Save warehouse"}
              </Button>
            </DialogFooter>
          </form>
        </CreateEntryDialog>
      </PageActionBar>

      {error && !isLoading ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : null}

      <WarehousesDataTable
        data={warehouses}
        serverSide={serverSide}
        isLoading={isLoading}
      />
    </div>
  );
}
