# Inspection list & KPI filter API — backend spec

The dashboard inspections UI is updated to send **kpi-parameters values** on list and KPI endpoints. Detail/view routes are unchanged (UUID in path).

**Filter metadata (UI):** `GET /api/reports/kpi-parameters` — single call, cached until logout.

**Reference implementation:** `OperationsAnalyticsRequest` + `build_kpi_parameters()` in `api/mod/api/reports/` already use the correct value shapes.

---

## Design rule

| Use case                                                                     | Identifier                                                                                                             |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| List filters, KPI filters, report filters                                    | **Warehouse/plant numeric id**, **product category pair key** (`category_type\|sub_category_type`) from kpi-parameters |
| Detail/view URLs, `GET /api/inspections/{inspection_uuid}`, admin CRUD paths | **UUID**                                                                                                               |

Do **not** require category or warehouse UUIDs on list/KPI query params.

---

## 1. `GET /api/inspections` (paginated list)

### Remove (breaking)

- `warehouse_uuids: list[UUID]`
- `product_category_uuids: list[UUID]`
- `plant_uuid: UUID` (single)

### Add / replace with

| Query param        | Type     | Repeat                                  | Source                                    | Notes                                                                          |
| ------------------ | -------- | --------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| `warehouse_ids`    | `int`    | yes (`warehouse_ids=1&warehouse_ids=2`) | kpi-parameters `warehouses[].value`       | Omit or empty = all (subject to role scope)                                    |
| `plant_ids`        | `int`    | yes                                     | kpi-parameters `plants[].value`           | Inbound-only; omit = all                                                       |
| `product_category` | `string` | yes                                     | kpi-parameters `product_category[].value` | Pair key e.g. `AC\|SPLIT`; parse with existing `parse_product_category_pair()` |
| `inspector_uuids`  | `UUID`   | yes                                     | future metadata                           | Optional; operators still scoped to own rows                                   |

### Keep unchanged

- `page`, `per_page`, `search`, `sort_by`, `sort_dir`
- `date_field`, `date_from`, `date_to`
- `inspection_type` (`inbound` \| `outbound`)
- `is_active`

### Resolution (suggested)

Reuse reports helpers:

- `resolve_warehouse_codes(db, warehouse_ids)` → filter `Inspection.warehouse_code`
- `resolve_product_category_pairs(db, product_category)` → filter `Inspection.product_category_id`
- `resolve_plant_codes(db, plant_ids)` → filter `Inspection.supplier_plant_code` (inbound)

`inspector_uuids` → existing `resolve_inspector_user_ids()`.

### Response

No change: list items keep **`uuid`** for links to `GET /api/inspections/{inspection_uuid}`.

### Example

```
GET /api/inspections?page=1&per_page=20&sort_by=created_at&sort_dir=desc
  &warehouse_ids=1&warehouse_ids=5
  &product_category=AC|SPLIT&product_category=DC|DIRECT COOL
  &inspection_type=inbound
  &date_field=created_at&date_from=2026-01-01&date_to=2026-01-31
  &search=73570
```

---

## 2. `GET /api/inspections/kpis`

Align filter vocabulary with the list endpoint and kpi-parameters.

### Remove

- `warehouse_uuid: UUID` (single)
- `plant_uuid: UUID` (single)

### Add

| Query param        | Type     | Repeat | Notes                                      |
| ------------------ | -------- | ------ | ------------------------------------------ |
| `warehouse_ids`    | `int`    | yes    | Multi-warehouse; omit = role default / all |
| `plant_ids`        | `int`    | yes    | Inbound-only                               |
| `product_category` | `string` | yes    | Pair keys                                  |

### Keep

- `period`, `date_from`, `date_to`, `is_active`

### Example

```
GET /api/inspections/kpis?date_from=2026-01-01&date_to=2026-01-31
  &warehouse_ids=1&product_category=AC|SPLIT
```

---

## 3. Optional — scoped list routes (follow-up)

These pages still **client-refine** rows until the API supports:

| UI route                        | Needed server filter                                 |
| ------------------------------- | ---------------------------------------------------- |
| Flagged / failed checklist      | `checklist_status=fail` or `has_checklist_fail=true` |
| In-review / approved / rejected | `review_status` or `review_lane` enum                |

Without this, page `total` and row count can disagree with visible rows.

---

## 4. Optional — flagged images (follow-up)

`flagged-images` loads `GET /api/inspections/{uuid}` per row on the current page. A dedicated paginated endpoint for failed-check images would remove N+1 detail calls.

---

## 5. OpenAPI / Orval

After implementing:

1. Update `InspectionListQueryParams` in `api/mod/api/inspection/request.py`
2. Update KPI query params in `api/mod/api/inspection/router.py`
3. Regenerate `openapi.json`
4. UI runs `pnpm api:sync` and can drop `customInstance` shims in `fetchInspectionsPage` / `fetchInspectionKpis` if desired

---

## 6. UI files already targeting this contract

| File                                                                  | Role                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/services/inspection-list-api-params.ts`                          | Param types + serializers                                                     |
| `src/services/inspections-api.ts`                                     | `fetchInspectionsListResponse`, `fetchInspectionsPage`, `fetchInspectionKpis` |
| `src/pages/dashboard/inspections/components/inspection-list-query.ts` | Maps filter dialog → query params                                             |
| `src/pages/dashboard/inspections/components/inspection-filters.ts`    | Loads options from kpi-parameters                                             |
| `src/services/kpi-parameters-api.ts`                                  | `GET /api/reports/kpi-parameters`                                             |

**Note:** List/KPI calls use `customInstance` with the new query keys until OpenAPI is regenerated. Filters will 422 or be ignored until the backend matches this spec.

---

## 7. kpi-parameters response (unchanged)

```json
{
  "warehouses": [{ "value": "1", "label": "FI13 - Pune NDC" }],
  "plants": [{ "value": "1", "label": "PI01 - Factory-FRO" }],
  "product_category": [{ "value": "AC|SPLIT", "label": "AC - SPLIT" }],
  "gradings": [{ "value": "DGR", "label": "DGR" }]
}
```

- `warehouses[].value` → `warehouse_ids[]`
- `plants[].value` → `plant_ids[]`
- `product_category[].value` → `product_category[]`
