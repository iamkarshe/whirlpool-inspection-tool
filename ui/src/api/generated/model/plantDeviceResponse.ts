/**
 * Plant-scoped device row from GET /api/plants/{plant_uuid} info (aligned with API).
 */
export interface PlantDeviceResponse {
  uuid: string;
  user_name: string;
  imei: string;
  device_type: string;
  is_locked: boolean;
  is_active: boolean;
}
