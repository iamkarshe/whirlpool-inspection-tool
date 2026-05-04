import { ExternalLink, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { MultiSelectCombobox } from "@/components/filters/multi-select-combobox";
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

export type MultiSelectFilterOption = {
  id: string;
  label: string;
};

export type MultiSelectFilterSection = {
  /** Query param key, e.g. "warehouse" */
  key: string;
  label: string;
  options: MultiSelectFilterOption[];
  /** Optional contextual link rendered in section header. */
  actionHref?: string;
  actionLabel?: string;
};

export type MultiSelectFiltersValue = Record<string, string[]>;

function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function normalizeValue(
  value: MultiSelectFiltersValue,
  sections: MultiSelectFilterSection[],
) {
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
  /** Called when the dialog opens (e.g. lazy-load filter option lists). */
  onDialogOpen,
  /** When true, filter controls are disabled and a loading state is shown. */
  optionsLoading = false,
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
  onDialogOpen?: () => void;
  optionsLoading?: boolean;
}) {
  const normalizedValue = useMemo(
    () => normalizeValue(value, sections),
    [value, sections],
  );

  const totalSelected = useMemo(
    () =>
      sections.reduce(
        (acc, s) => acc + (normalizedValue[s.key]?.length ?? 0),
        0,
      ),
    [normalizedValue, sections],
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MultiSelectFiltersValue>(
    () => normalizedValue,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(normalizedValue);
      onDialogOpen?.();
    }
    setOpen(nextOpen);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        {optionsLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            Loading filter options…
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => {
              const selected = draft[section.key] ?? [];
              return (
                <div
                  key={section.key}
                  className="w-full rounded-lg border bg-muted/10 p-3"
                >
                  {(section.actionHref || section.actionLabel) && (
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {section.label}
                      </p>
                      {section.actionHref ? (
                        <Link
                          to={section.actionHref}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          {section.actionLabel ?? `Open ${section.label}`}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                  )}
                  <MultiSelectCombobox
                    label={section.label}
                    options={section.options}
                    value={selected}
                    onChange={(next) =>
                      setDraft((prev) => ({ ...prev, [section.key]: next }))
                    }
                  />
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={clearAndApply} disabled={optionsLoading}>
            Clear
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={optionsLoading}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
