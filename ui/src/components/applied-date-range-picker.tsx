import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export type AppliedDateRangePickerProps = {
  draft: DateRange | undefined;
  onDraftChange: (range: DateRange | undefined) => void;
  onApply: () => void;
  isDirty: boolean;
  className?: string;
  applyLabel?: string;
};

export function AppliedDateRangePicker({
  draft,
  onDraftChange,
  onApply,
  isDirty,
  className,
  applyLabel = "Apply",
}: AppliedDateRangePickerProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <CalendarDateRangePicker value={draft} onChange={onDraftChange} />
      <Button type="button" size="sm" disabled={!isDirty} onClick={onApply}>
        {applyLabel}
      </Button>
    </div>
  );
}
