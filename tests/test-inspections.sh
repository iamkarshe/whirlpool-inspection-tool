#!/usr/bin/env bash

set -euo pipefail

API_BASE_URL="http://localhost:8000"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwianRpIjoiYTFiNjg5NzI0MjEwNDFiNGE2NGZkNzlmNjU2YmJlMDUiLCJleHAiOjE3ODAwMDEyODQsImRldmljZV9pZCI6MTB9._G4WgCTeIGzrFGfffxNe7eFjEPUD6NoB3PBmSA9eO7g"

DEFECT_PAYLOAD_FILE="payload-defect.json"
GOOD_PAYLOAD_FILE="payload-good.json"
RUNTIME_PAYLOAD_FILE="${RUNTIME_PAYLOAD_FILE:-payload.json}"

DAMAGE_TYPES=("packaging" "cosmetic" "accessories")
DAMAGE_SEVERITIES=("minor" "major")
DAMAGE_CAUSES=("transit" "handling" "packaging" "manufacturing")
DAMAGE_GRADES=("DGR" "LDGR" "SCRAP")
INSPECTION_TYPES=("inbound" "outbound")

WAREHOUSE_CODES=(
  "FI13"
  "RI10"
  "RI13"
  "RI21"
  "RI24"
  "RI25"
  "RI29"
  "RI31"
  "RI34"
  "RI36"
  "RI38"
  "RI43"
  "RI52"
  "RI62"
  "RI67"
  "RI70"
  "RI75"
  "RI74"
  "RI91"
  "RI92"
  "RIA4"
  "RIA8"
  "RIB6"
  "RIB7"
  "RIE1"
  "RIE2"
  "RIE3"
  "RIE4"
  "RIE5"
  "RIE6"
  "RIE7"
  "RIF2"
  "RIF5"
  "RIF6"
  "RIF8"
  "RIF9"
)

PLANT_CODES=(
  "PI01"
  "PI11"
  "PI21"
)

TRUCK_NUMBERS=(
  "MH12AB4587"
  "MH14CD7821"
  "MH46EF9134"
  "MH04GH6720"
  "MH15JK3498"
  "DL01LM2245"
  "DL10NP8762"
  "HR26QR5519"
  "HR55ST9081"
  "RJ14UV3342"
  "RJ27WX7716"
  "GJ01YA4928"
  "GJ05ZB6183"
  "GJ18CD7402"
  "KA01EF2359"
  "KA03GH8890"
  "KA51JK1207"
  "TN09LM5644"
  "TN22NP9075"
  "TN45QR3418"
  "TS08ST7761"
  "TS12UV4306"
  "AP16WX9824"
  "AP39YA6570"
  "UP16ZB2189"
  "UP32CD8043"
  "WB19EF3927"
  "OD05GH7415"
  "PB10JK6832"
  "CG04LM5296"
)

# Checklist ids 1–17 (sort_order) — Outer Packaging, Inner Packaging, Product sections.
DEFECT_CHECKLIST_IDS=(1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17)

declare -A DEFECT_REMARKS=(
  [1]="carton crushed on corner during unloading"
  [2]="forklift handling marks on outer carton"
  [3]="signs of re-taping on outer carton"
  [4]="one strap loose on outer packaging"
  [5]="MRP label torn and not fully legible"
  [6]="serial number label missing"
  [7]="energy rating label not present"
  [8]="EPS foam cracked at corner"
  [9]="machine protective cover torn"
  [10]="dent and scratch on product body"
  [11]="lid tray cracked inside unit"
  [12]="gasket seal broken"
  [13]="inlet hose missing from accessories"
  [14]="outlet hose missing from accessories"
  [15]="user manual not included"
  [16]="warranty card missing"
  [17]="installation kit incomplete"
)

declare -A DEFECT_CHECKLIST_LABELS=(
  [1]="Outer Packaging / Carton — condition"
  [2]="Outer Packaging / Carton — forklift marks"
  [3]="Outer Packaging / Carton — re-taping"
  [4]="Outer Packaging / Straps"
  [5]="Outer Packaging / Labels — MRP"
  [6]="Outer Packaging / Labels — serial"
  [7]="Outer Packaging / Labels — energy rating"
  [8]="Inner Packaging — EPS foam"
  [9]="Inner Packaging — protective cover"
  [10]="Product / Body outside"
  [11]="Product / Internal"
  [12]="Product / Seals"
  [13]="Product / Accessories — inlet hose"
  [14]="Product / Accessories — outlet hose"
  [15]="Product / Accessories — user manual"
  [16]="Product / Accessories — warranty card"
  [17]="Product / Accessories — installation kit"
)

damage_type_for_checklist_id() {
  local checklist_id="$1"

  if [[ "$checklist_id" -le 12 ]]; then
    if [[ "$checklist_id" -le 9 ]]; then
      echo "packaging"
    else
      echo "cosmetic"
    fi
  else
    echo "accessories"
  fi
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name"
    exit 1
  fi
}

pick_random() {
  local -n values="$1"
  echo "${values[$RANDOM % ${#values[@]}]}"
}

generate_suffix() {
  LC_ALL=C tr -dc 'A-Z0-9' </dev/urandom | head -c 4
}

generate_barcode() {
  local suffix
  suffix="$(generate_suffix)"
  echo "31602012552B${suffix}"
}

require_file() {
  local file_path="$1"

  if [[ ! -f "$file_path" ]]; then
    echo "Required file not found: $file_path"
    exit 1
  fi
}

require_command "curl"
require_command "jq"
require_file "$DEFECT_PAYLOAD_FILE"
require_file "$GOOD_PAYLOAD_FILE"

barcode="$(generate_barcode)"
inspection_type="$(pick_random INSPECTION_TYPES)"
warehouse_code="$(pick_random WAREHOUSE_CODES)"

if [[ "$inspection_type" == "inbound" ]]; then
  plant_code="$(pick_random PLANT_CODES)"
else
  plant_code=""
fi

truck_number="$(pick_random TRUCK_NUMBERS)"
device_time_taken=$((90 + RANDOM % 211))

random_chance=$((RANDOM % 100))

if [[ "$random_chance" -lt 60 ]]; then
  selected_payload_file="$DEFECT_PAYLOAD_FILE"
  is_defective="true"
  defect_checklist_id="$(pick_random DEFECT_CHECKLIST_IDS)"
  defect_remarks="${DEFECT_REMARKS[$defect_checklist_id]}"
  defect_checklist_label="${DEFECT_CHECKLIST_LABELS[$defect_checklist_id]}"
  damage_type="$(damage_type_for_checklist_id "$defect_checklist_id")"
  damage_severity="$(pick_random DAMAGE_SEVERITIES)"
  damage_cause="$(pick_random DAMAGE_CAUSES)"
  damage_grade="$(pick_random DAMAGE_GRADES)"
else
  selected_payload_file="$GOOD_PAYLOAD_FILE"
  is_defective="false"
fi

echo "Generated barcode: $barcode"
echo "Inspection type: $inspection_type"
echo "Warehouse code: $warehouse_code"
if [[ "$inspection_type" == "inbound" ]]; then
  echo "Supplier plant code: $plant_code"
else
  echo "Supplier plant code: (not used for outbound)"
fi
echo "Selected payload: $selected_payload_file"
echo "Defective: $is_defective"
if [[ "$is_defective" == "true" ]]; then
  echo "Defect checklist id: $defect_checklist_id ($defect_checklist_label)"
  echo "Defect remarks: $defect_remarks"
  echo "Damage type: $damage_type"
  echo "Damage severity: $damage_severity"
  echo "Damage cause: $damage_cause"
  echo "Damage grade: $damage_grade"
fi
echo "Truck number: $truck_number"
echo "Device time taken: ${device_time_taken}s"

echo "Requesting barcode lock..."

lock_response="$(
  curl --silent --show-error --fail \
    --request POST \
    --url "${API_BASE_URL}/api/inspections/barcode-lock" \
    --header "authorization: Bearer ${TOKEN}" \
    --header "content-type: application/json" \
    --data "{
      \"barcode\": \"${barcode}\",
      \"inspection_type\": \"${inspection_type}\"
    }"
)"

echo "Barcode lock response:"
echo "$lock_response" | jq .

echo "Building runtime payload..."

apply_runtime_fields() {
  local payload_file="$1"

  jq \
    --arg barcode "$barcode" \
    --arg warehouse_code "$warehouse_code" \
    --arg inspection_type "$inspection_type" \
    --arg plant_code "$plant_code" \
    --arg truck_number "$truck_number" \
    --argjson device_time_taken "$device_time_taken" \
    '
    .barcode = $barcode
    | .warehouse_code = $warehouse_code
    | .truck_number = $truck_number
    | .device_time_taken = $device_time_taken
    | if $inspection_type == "inbound" then
        .supplier_plant_code = $plant_code
      else
        .supplier_plant_code = null
      end
    ' "$payload_file"
}

if [[ "$is_defective" == "true" ]]; then
  apply_runtime_fields "$selected_payload_file" \
    | jq \
      --argjson defect_checklist_id "$defect_checklist_id" \
      --arg defect_remarks "$defect_remarks" \
      --arg damage_type "$damage_type" \
      --arg damage_severity "$damage_severity" \
      --arg damage_cause "$damage_cause" \
      --arg damage_grade "$damage_grade" \
      '
      .damage_type = $damage_type
      | .damage_severity = $damage_severity
      | .damage_cause = $damage_cause
      | .damage_grade = $damage_grade
      | . as $root
      | .checklist_answers = (
          .checklist_answers
          | map(
              if .id == $defect_checklist_id then
                {
                  id: .id,
                  value: "no",
                  remarks: $defect_remarks,
                  image_path: [
                    if $defect_checklist_id <= 7 then
                      $root.outer_packaging_side_images[0]
                    elif $defect_checklist_id <= 9 then
                      $root.inner_packaging_side_images[0]
                    else
                      $root.product_side_images[0]
                    end
                  ]
                }
              else
                { id: .id, value: "yes" }
              end
            )
        )
      ' >"$RUNTIME_PAYLOAD_FILE"
else
  apply_runtime_fields "$selected_payload_file" \
    | jq \
      '
      .damage_type = null
      | .damage_severity = null
      | .damage_cause = null
      | .damage_grade = null
      ' >"$RUNTIME_PAYLOAD_FILE"
fi

echo "Runtime payload created: $RUNTIME_PAYLOAD_FILE"

echo "Inserting inspection..."

insert_response="$(
  curl --silent --show-error --fail \
    --request POST \
    --url "${API_BASE_URL}/api/inspections/${inspection_type}" \
    --header "authorization: Bearer ${TOKEN}" \
    --header "content-type: application/json" \
    --data @"${RUNTIME_PAYLOAD_FILE}"
)"

echo "Inspection insert response:"
echo "$insert_response" | jq .

echo "Done."