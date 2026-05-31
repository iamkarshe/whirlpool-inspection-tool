import { useMemo } from "react";

import { MultiSelectCombobox } from "@/components/filters/multi-select-combobox";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";

type UserWarehouseSelectProps = {
  id: string;
  label: string;
  value: string[];
  onValueChange: (warehouseCodes: string[]) => void;
  warehouses: WarehouseResponse[];
  disabled?: boolean;
  placeholder?: string;
};

export function UserWarehouseSelect({
  id,
  label,
  value,
  onValueChange,
  warehouses,
  disabled,
  placeholder = "Select warehouses",
}: UserWarehouseSelectProps) {
  const options = useMemo(() => {
    const active = warehouses
      .filter((w) => w.is_active)
      .slice()
      .sort((a, b) => a.warehouse_code.localeCompare(b.warehouse_code));

    const activeCodes = new Set(active.map((w) => w.warehouse_code));
    const assignedNotInList = value.filter(
      (code) => code.trim() && !activeCodes.has(code.trim()),
    );

    const extraOptions = assignedNotInList.map((code) => ({
      id: code.trim(),
      label: `${code.trim()} — currently assigned`,
    }));

    const activeOptions = active.map((w) => ({
      id: w.warehouse_code,
      label: `${w.warehouse_code} — ${w.name}`,
    }));

    return [...extraOptions, ...activeOptions];
  }, [value, warehouses]);

  return (
    <div id={id}>
      <MultiSelectCombobox
        label={label}
        options={options}
        value={value}
        onChange={onValueChange}
        placeholder={placeholder}
        disabled={disabled || options.length === 0}
      />
    </div>
  );
}
