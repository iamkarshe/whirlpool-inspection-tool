import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type MultiSelectComboboxOption = {
  id: string;
  label: string;
};

export function MultiSelectCombobox({
  label,
  options,
  value,
  onChange,
  placeholder = "All",
  className,
}: {
  label: string;
  options: MultiSelectComboboxOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const valueSet = useMemo(() => new Set(value), [value]);
  const selectedCount = value.length;

  const buttonText = useMemo(() => {
    if (selectedCount === 0) return placeholder;
    const first = options.find((o) => o.id === value[0])?.label;
    if (!first) return `${selectedCount} selected`;
    if (selectedCount === 1) return first;
    return `${first} +${selectedCount - 1}`;
  }, [options, placeholder, selectedCount, value]);

  function toggle(id: string) {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next).sort());
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-sm font-medium">{label}</div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
          >
            <span className={cn("truncate", selectedCount === 0 && "text-muted-foreground")}>
              {buttonText}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList className="max-h-64">
              <CommandEmpty>No results.</CommandEmpty>
              {options.map((opt) => {
                const checked = valueSet.has(opt.id);
                return (
                  <CommandItem
                    key={opt.id}
                    value={opt.label}
                    onSelect={() => toggle(opt.id)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => {}} />
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

