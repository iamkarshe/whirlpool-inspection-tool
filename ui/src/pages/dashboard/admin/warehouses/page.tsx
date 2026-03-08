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
import WarehousesDataTable from "./data-table";
import {
  getWarehouses,
  type Warehouse,
} from "@/pages/dashboard/admin/warehouses/warehouse-service";
import { FileDown, Upload } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";

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

  const [csvFile, setCsvFile] = useState<File | null>(null);
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

  const handleCsvSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    // TODO: wire real CSV upload; for now this is mocked.
    console.log("Mock warehouses CSV upload", csvFile);
  };

  const handleDownloadTemplate = () => {
    const header = "name,warehouse_code,address,lat,lng\n";
    const exampleRow = "Pune North Hub,WH-PUN-01,Hinjawadi Pune Maharashtra,18.5204,73.8567\n";
    const csvContent = `${header}${exampleRow}`;

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "warehouses-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Warehouses"
        description="Manage master data for all warehouses."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Upload className="mr-1 h-4 w-4" />
              Upload CSV
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Warehouses</DialogTitle>
              <DialogDescription>
                Select a CSV file containing warehouses to import.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCsvSubmit}>
              <div className="space-y-2">
                <Label htmlFor="warehousesCsv">CSV file</Label>
                <Input
                  id="warehousesCsv"
                  type="file"
                  accept=".csv"
                  onChange={(event) => {
                    const file =
                      event.target.files && event.target.files[0]
                        ? event.target.files[0]
                        : null;
                    setCsvFile(file);
                  }}
                />
              </div>
              <DialogFooter className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <FileDown className="mr-1 h-4 w-4" />
                  Template CSV
                </Button>
                <Button type="submit" disabled={!csvFile}>
                  Upload
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
