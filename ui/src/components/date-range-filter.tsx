"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, X } from "lucide-react";
import * as React from "react";

export type DateRangeFilterValue = {
  from: string;
  to: string;
};

/** Values are datetime-local format (YYYY-MM-DDTHH:mm) or empty string for no bound. */
export interface DateRangeFilterProps {
  value: DateRangeFilterValue;
  onChange: (value: DateRangeFilterValue) => void;
  label?: string;
  className?: string;
}

/** Format Date for input[type=datetime-local] (no seconds/timezone). */
export function toDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateRangeFilter({
  value,
  onChange,
  label = "Date range",
  className,
}: DateRangeFilterProps) {
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, from: e.target.value });
  };
  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, to: e.target.value });
  };
  const handleClear = () => {
    onChange({ from: "", to: "" });
  };
  const hasValue = value.from !== "" || value.to !== "";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {label && (
            <Label className="text-muted-foreground whitespace-nowrap text-xs">
              {label}
            </Label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="datetime-local"
            value={value.from}
            onChange={handleFromChange}
            className="h-8 w-[180px] text-xs"
            aria-label="From date and time"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="datetime-local"
            value={value.to}
            onChange={handleToChange}
            className="h-8 w-[180px] text-xs"
            aria-label="To date and time"
          />
          {hasValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={handleClear}
              aria-label="Clear date range"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

