import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, TriangleAlert } from "lucide-react";

import type { WarehousePermanentDeleteResponse } from "@/api/generated/model/warehousePermanentDeleteResponse";
import type { WarehouseResponse } from "@/api/generated/model/warehouseResponse";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteWarehousePermanently,
  warehouseApiErrorMessage,
} from "@/services/warehouses-api";

export type DeleteWarehouseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse: WarehouseResponse | null;
  onDeleted: () => void;
};

type JsonTableRow = {
  key: string;
  value: string;
};

function responseToTableRows(data: unknown): JsonTableRow[] {
  if (data === null || data === undefined) {
    return [{ key: "response", value: "—" }];
  }
  if (typeof data !== "object" || Array.isArray(data)) {
    return [{ key: "response", value: JSON.stringify(data) }];
  }
  return Object.entries(data as Record<string, unknown>).map(([key, value]) => ({
    key,
    value:
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value ?? ""),
  }));
}

type DeleteWarehouseDialogContentProps = {
  warehouse: WarehouseResponse;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
};

function DeleteWarehouseDialogContent({
  warehouse,
  onOpenChange,
  onDeleted,
}: DeleteWarehouseDialogContentProps) {
  const [deleteToken, setDeleteToken] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteResponse, setDeleteResponse] =
    useState<WarehousePermanentDeleteResponse | null>(null);

  const handleDelete = async () => {
    const token = deleteToken.trim();
    if (!token) {
      setError("Enter the critical admin delete token.");
      return;
    }

    setError(null);
    setDeleting(true);
    try {
      const response = await deleteWarehousePermanently(warehouse.uuid, token);
      setDeleteResponse(response);
      toast.success("Warehouse deleted.");
      onDeleted();
    } catch (e: unknown) {
      setError(warehouseApiErrorMessage(e, "Could not delete warehouse."));
    } finally {
      setDeleting(false);
    }
  };

  const resultRows = deleteResponse ? responseToTableRows(deleteResponse) : [];

  if (deleteResponse) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Delete response</DialogTitle>
          <DialogDescription>
            Raw API response from the delete request.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Key</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultRows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-mono text-xs">{row.key}</TableCell>
                  <TableCell className="break-all font-mono text-xs">
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete warehouse permanently?</DialogTitle>
        <DialogDescription>
          This permanently removes {warehouse.name} ({warehouse.warehouse_code})
          and cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Deleting a warehouse may fail if inspections or other records still
            reference it. This requires a critical admin delete token.
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Label htmlFor="warehouse-delete-token">
            x-critical-admin-delete-token
          </Label>
          <Input
            id="warehouse-delete-token"
            type="password"
            autoComplete="off"
            value={deleteToken}
            onChange={(event) => setDeleteToken(event.target.value)}
            placeholder="Enter admin delete token"
          />
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Delete failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={deleting}
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={deleting}
          onClick={() => void handleDelete()}
        >
          {deleting ? "Deleting…" : "Delete warehouse"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function DeleteWarehouseDialog({
  open,
  onOpenChange,
  warehouse,
  onDeleted,
}: DeleteWarehouseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {warehouse ? (
          <DeleteWarehouseDialogContent
            key={warehouse.uuid}
            warehouse={warehouse}
            onOpenChange={onOpenChange}
            onDeleted={onDeleted}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
