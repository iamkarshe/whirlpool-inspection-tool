/**
 * Plant-scoped user row from GET /api/plants/{plant_uuid} info (aligned with API).
 */
export interface PlantUserResponse {
  name: string;
  email: string;
  mobile_number: string;
  designation: string;
  is_active: boolean;
}
