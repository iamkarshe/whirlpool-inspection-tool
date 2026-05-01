import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UserWarehouseSelectProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (warehouseCode: string) => void;
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
  placeholder = "Select warehouse scope",
}: UserWarehouseSelectProps) {
  const active = warehouses
    .filter((w) => w.is_active)
    .slice()
    .sort((a, b) => a.warehouse_code.localeCompare(b.warehouse_code));

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value || "__none__"}
        onValueChange={(v) => onValueChange(v === "__none__" ? "" : v)}
        disabled={disabled || active.length === 0}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          {active.map((w) => (
            <SelectItem key={w.uuid} value={w.warehouse_code}>
              {w.warehouse_code} — {w.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
