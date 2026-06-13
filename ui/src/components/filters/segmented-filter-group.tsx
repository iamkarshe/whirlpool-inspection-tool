import type { FilterOption } from "@/api/generated/model/filterOption";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const ALL_SEGMENT_VALUE = "__all__";

export type SegmentedFilterGroupProps = {
  options: FilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  includeAll?: boolean;
  allLabel?: string;
  className?: string;
  disabled?: boolean;
};

export function SegmentedFilterGroup({
  options,
  value,
  onChange,
  includeAll = true,
  allLabel = "All",
  className,
  disabled = false,
}: SegmentedFilterGroupProps) {
  const toggleValue = value ?? ALL_SEGMENT_VALUE;

  return (
    <div className={cn("overflow-x-auto pb-1", className)}>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={toggleValue}
        disabled={disabled}
        onValueChange={(next) => {
          if (!next) return;
          onChange(next === ALL_SEGMENT_VALUE ? null : next);
        }}
        className="flex w-max max-w-full flex-wrap justify-start gap-1"
      >
        {includeAll ? (
          <ToggleGroupItem value={ALL_SEGMENT_VALUE} className="px-3">
            {allLabel}
          </ToggleGroupItem>
        ) : null}
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="px-3"
          >
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
