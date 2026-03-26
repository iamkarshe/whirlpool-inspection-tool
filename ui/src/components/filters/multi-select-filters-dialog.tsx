import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MultiSelectCombobox } from "@/components/filters/multi-select-combobox";

export type MultiSelectFilterOption = {
  id: string;
  label: string;
};

export type MultiSelectFilterSection = {
  /** Query param key, e.g. "warehouse" */
  key: string;
  label: string;
  options: MultiSelectFilterOption[];
};

export type MultiSelectFiltersValue = Record<string, string[]>;

function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function normalizeValue(value: MultiSelectFiltersValue, sections: MultiSelectFilterSection[]) {
  const out: MultiSelectFiltersValue = {};
  for (const s of sections) out[s.key] = uniqSorted(value[s.key] ?? []);
  return out;
}

export function MultiSelectFiltersDialog({
  title = "Filters",
  description = "Refine results and share via URL.",
  sections,
  value,
  onApply,
  onClear,
  triggerLabel = "Filters",
  triggerVariant = "outline",
  triggerSize = "sm",
  className,
}: {
  title?: string;
  description?: string;
  sections: MultiSelectFilterSection[];
  value: MultiSelectFiltersValue;
  onApply: (next: MultiSelectFiltersValue) => void;
  onClear?: () => void;
  triggerLabel?: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const normalizedValue = useMemo(
    () => normalizeValue(value, sections),
    [value, sections],
  );

  const totalSelected = useMemo(
    () =>
      sections.reduce((acc, s) => acc + (normalizedValue[s.key]?.length ?? 0), 0),
    [normalizedValue, sections],
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MultiSelectFiltersValue>(() => normalizedValue);

  useEffect(() => {
    if (!open) setDraft(normalizedValue);
  }, [open, normalizedValue]);

  function toggle(sectionKey: string, id: string) {
    setDraft((prev) => {
      const set = new Set(prev[sectionKey] ?? []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, [sectionKey]: uniqSorted(Array.from(set)) };
    });
  }

  function clearLocal() {
    const empty: MultiSelectFiltersValue = {};
    for (const s of sections) empty[s.key] = [];
    setDraft(empty);
  }

  function apply() {
    onApply(normalizeValue(draft, sections));
    setOpen(false);
  }

  function clearAndApply() {
    clearLocal();
    onClear?.();
    const empty: MultiSelectFiltersValue = {};
    for (const s of sections) empty[s.key] = [];
    onApply(empty);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={cn(className)}
        >
          {triggerLabel}
          {totalSelected > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {totalSelected}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sections.map((section) => {
            const selected = draft[section.key] ?? [];
            return (
              <div key={section.key} className="w-full">
                <MultiSelectCombobox
                  label={section.label}
                  options={section.options}
                  value={selected}
                  onChange={(next) => setDraft((prev) => ({ ...prev, [section.key]: next }))}
                />
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={clearAndApply}>
            Clear
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

