/**
 * Warehouse-scoped device row from GET /api/warehouses/{warehouse_uuid} info.
 */
export interface WarehouseDeviceResponse {
  uuid: string;
  user_name: string;
  imei: string;
  device_type: string;
  is_locked: boolean;
  is_active: boolean;
}
