import type { ReactNode } from "react";

import type { FilterOption } from "@/api/generated/model/filterOption";
import {
  getSegmentFilterIcon,
  type SegmentFilterKind,
} from "@/components/filters/segment-filter-icons";
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
  /** Visual density — secondary rows (status chips) are slightly smaller. */
  size?: "default" | "compact";
  /** Hint for default icons per segment value. */
  kind?: SegmentFilterKind;
};

type SegmentPillProps = {
  active: boolean;
  disabled?: boolean;
  label: string;
  icon?: ReactNode;
  size: "default" | "compact";
  onClick: () => void;
};

function SegmentPill({
  active,
  disabled,
  label,
  icon,
  size,
  onClick,
}: SegmentPillProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium uppercase tracking-wide transition-[color,box-shadow,background-color]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "compact" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
        active
          ? "border-border bg-background text-foreground shadow-sm"
          : "border-transparent bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon ? (
        <span className="inline-flex [&>svg]:size-3 [&>svg]:shrink-0">
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </button>
  );
}

export function SegmentedFilterGroup({
  options,
  value,
  onChange,
  includeAll = true,
  allLabel = "All",
  className,
  disabled = false,
  size = "default",
  kind = "all",
}: SegmentedFilterGroupProps) {
  const activeValue = value ?? ALL_SEGMENT_VALUE;

  const renderIcon = (segmentValue: string) => {
    const Icon = getSegmentFilterIcon(segmentValue, kind);
    return Icon ? <Icon aria-hidden /> : null;
  };

  return (
    <div
      role="tablist"
      aria-label="Filter"
      className={cn("overflow-x-auto pb-0.5", className)}
    >
      <div className="flex w-max max-w-full flex-wrap gap-1.5">
        {includeAll ? (
          <SegmentPill
            active={activeValue === ALL_SEGMENT_VALUE}
            disabled={disabled}
            label={allLabel}
            icon={renderIcon(ALL_SEGMENT_VALUE)}
            size={size}
            onClick={() => onChange(null)}
          />
        ) : null}
        {options.map((option) => (
          <SegmentPill
            key={option.value}
            active={activeValue === option.value}
            disabled={disabled}
            label={option.label}
            icon={renderIcon(option.value)}
            size={size}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}
