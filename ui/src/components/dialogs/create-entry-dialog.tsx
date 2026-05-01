import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function CreateEntryDialog({
  triggerLabel,
  triggerVariant,
  triggerSize,
  title,
  description,
  children,
  contentClassName,
  open,
  onOpenChange,
}: {
  triggerLabel: string;
  triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"];
  title: string;
  description?: string;
  children: ReactNode;
  contentClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>
          <span className="mr-1">+</span>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(contentClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

