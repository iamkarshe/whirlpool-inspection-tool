import CsvUploadDialog from "@/components/csv-upload-dialog";
import { CreateEntryDialog } from "@/components/dialogs/create-entry-dialog";
import PageActionBar from "@/components/page-action-bar";
import SkeletonTable from "@/components/skeleton7";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getPlants,
  type Plant,
} from "@/pages/dashboard/admin/plants/plant-service";
import type { ChangeEvent, SubmitEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import PlantsDataTable from "./data-table";

type PlantFormValues = {
  name: string;
  plant_code: string;
  address: string;
  lat: string;
  lng: string;
};

export default function PlantsPage() {
  const [formValues, setFormValues] = useState<PlantFormValues>({
    name: "",
    plant_code: "",
    address: "",
    lat: "",
    lng: "",
  });

  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlants = async () => {
      try {
        const data = await getPlants();
        setPlants(data);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlants();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    console.log("Mock create plant", formValues);
  };

  const handleCsvSubmit = (file: File) => {
    console.log("Mock plants CSV upload", file);
    toast.success("CSV uploaded successfully.");
  };

  const plantCsvTemplate =
    "name,plant_code,address,lat,lng\n" +
    "Pune North Plant,PL-PUN-01,Hinjawadi Pune Maharashtra,18.5204,73.8567\n";

  return (
    <div className="space-y-6">
      <PageActionBar title="Plants" description="Manage master data for all plants.">
        <CsvUploadDialog
          title="Upload Plants"
          description="Select a CSV file containing plants to import."
          templateFilename="plants-template.csv"
          templateContent={plantCsvTemplate}
          onSubmit={handleCsvSubmit}
        />

        <CreateEntryDialog
          triggerLabel="Add Plant"
          title="Add plant"
          description="Create a new plant location."
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
              <Label htmlFor="plant_code">Plant code</Label>
              <Input
                id="plant_code"
                name="plant_code"
                value={formValues.plant_code}
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
              <Button type="submit">Save plant</Button>
            </DialogFooter>
          </form>
        </CreateEntryDialog>
      </PageActionBar>

      {isLoading ? <SkeletonTable /> : <PlantsDataTable data={plants} />}
    </div>
  );
}
