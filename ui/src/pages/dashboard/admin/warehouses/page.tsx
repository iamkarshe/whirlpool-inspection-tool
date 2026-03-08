import CsvUploadDialog from "@/components/csv-upload-dialog";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
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
  getWarehouses,
  type Warehouse,
} from "@/pages/dashboard/admin/warehouses/warehouse-service";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import WarehousesDataTable from "./data-table";

type WarehouseFormValues = {
  name: string;
  warehouse_code: string;
  address: string;
  lat: string;
  lng: string;
};

type SubmitEvent = FormEvent<HTMLFormElement>;

export default function WarehousesPage() {
  const [formValues, setFormValues] = useState<WarehouseFormValues>({
    name: "",
    warehouse_code: "",
    address: "",
    lat: "",
    lng: "",
  });

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const data = await getWarehouses();
        setWarehouses(data);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWarehouses();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    // TODO: wire real create warehouse; mocked for now.
    console.log("Mock create warehouse", formValues);
  };

  const handleCsvSubmit = (file: File) => {
    // TODO: wire real CSV upload; for now this is mocked.
    console.log("Mock warehouses CSV upload", file);
  };

  const warehouseCsvTemplate =
    "name,warehouse_code,address,lat,lng\n" +
    "Pune North Hub,WH-PUN-01,Hinjawadi Pune Maharashtra,18.5204,73.8567\n";

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
          templateContent={warehouseCsvTemplate}
          onSubmit={handleCsvSubmit}
        />

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <span className="mr-1">+</span>
              Add Warehouse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add warehouse</DialogTitle>
              <DialogDescription>
                Create a new warehouse location.
              </DialogDescription>
            </DialogHeader>
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
              <DialogFooter>
                <Button type="submit">Save warehouse</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageActionBar>

      {isLoading ? (
        <SkeletonTable />
      ) : (
        <WarehousesDataTable data={warehouses} />
      )}
    </div>
  );
}
