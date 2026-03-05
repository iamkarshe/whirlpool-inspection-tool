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
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";

type WarehouseFormValues = {
  name: string;
  code: string;
  location: string;
  capacity: string;
};

export default function WarehousesPage() {
  const [formValues, setFormValues] = useState<WarehouseFormValues>({
    name: "",
    code: "",
    location: "",
    capacity: "",
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: wire real create warehouse; mocked for now.
    console.log("Mock create warehouse", formValues);
  };

  return (
    <div className="space-y-6">
      <PageActionBar
        title="Warehouses"
        description="Manage master data for all warehouses."
      >
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
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  name="code"
                  value={formValues.code}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formValues.location}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="0"
                  step="1"
                  value={formValues.capacity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save warehouse</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageActionBar>

      {isLoading ? <SkeletonTable /> : <WarehousesDataTable data={warehouses} />}
    </div>
  );
}

