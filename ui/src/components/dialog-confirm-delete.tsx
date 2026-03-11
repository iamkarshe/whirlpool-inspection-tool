import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";

export type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short entity label used in the warning copy, e.g. "product category". */
  entityLabel?: string;
  /** Optional custom title; falls back to "Delete {entityLabel}?" or "Delete item?". */
  title?: string;
  /** Optional description text shown below the title. */
  description?: string;
  /** Label for the destructive button; defaults to "Delete". */
  confirmLabel?: string;
  /** Label for the cancel button; defaults to "Cancel". */
  cancelLabel?: string;
  /** When provided, external loading state for the confirm action. */
  isLoading?: boolean;
  /** Called when the user confirms deletion. Can be async. */
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  entityLabel,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isLoading,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const loading = isLoading ?? internalLoading;
  const resolvedTitle =
    title ??
    (entityLabel ? `Delete ${entityLabel}?` : "Delete item?");

  const resolvedDescription =
    description ??
    (entityLabel
      ? `You are about to permanently delete this ${entityLabel}. This action cannot be undone.`
      : "You are about to permanently delete this item. This action cannot be undone.");

  const handleConfirmClick = async () => {
    try {
      if (isLoading == null) {
        setInternalLoading(true);
      }
      await onConfirm();
      onOpenChange(false);
    } finally {
      if (isLoading == null) {
        setInternalLoading(false);
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <TriangleAlert className="h-7 w-7" />
          </AlertDialogMedia>
          <AlertDialogTitle>{resolvedTitle}</AlertDialogTitle>
          <AlertDialogDescription>{resolvedDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <Alert variant="destructive">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Deleting this item may impact related data (e.g. products,
            checklists, inspections) that reference it.
          </AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmClick}
            disabled={loading}
            variant="destructive"
          >
            {loading ? `${confirmLabel}...` : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

