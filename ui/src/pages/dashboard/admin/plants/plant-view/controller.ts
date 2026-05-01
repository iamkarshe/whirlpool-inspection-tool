import {
  getPlantById,
  type Plant,
} from "@/pages/dashboard/admin/plants/plant-service";

export async function loadPlantView(id: string): Promise<Plant | null> {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return null;
  }
  return getPlantById(id);
}
