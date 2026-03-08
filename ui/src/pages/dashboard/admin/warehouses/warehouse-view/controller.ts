import {
  getWarehouseById,
  type Warehouse,
} from "@/pages/dashboard/admin/warehouses/warehouse-service";

/**
 * Load warehouse for the view page by id (UUID string).
 * Returns null if id is invalid or warehouse not found.
 */
export async function loadWarehouseView(
  id: string,
): Promise<Warehouse | null> {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return null;
  }
  return getWarehouseById(id);
}
