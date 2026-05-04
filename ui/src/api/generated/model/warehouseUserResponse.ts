/**
 * Warehouse-scoped user row from GET /api/warehouses/{warehouse_uuid} info.
 */
export interface WarehouseUserResponse {
  name: string;
  email: string;
  mobile_number: string;
  designation: string;
  is_active: boolean;
}
