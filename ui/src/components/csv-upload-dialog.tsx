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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2, Upload } from "lucide-react";
import type { ReactNode, SubmitEvent } from "react";
import { useId, useState } from "react";

export type CsvUploadDialogProps = {
  /** Dialog title (e.g. "Upload Warehouses") */
  title: string;
  /** Short description shown under the title */
  description: string;
  /** Filename for the template download (e.g. "warehouses-template.csv") */
  templateFilename: string;
  /** Full CSV string for the template (header + example row(s)) */
  templateContent: string;
  /** Called when the user submits the form with a file selected */
  onSubmit: (file: File) => void;
  /** Optional custom trigger (button). Defaults to outline "Upload CSV" button with icon. */
  trigger?: ReactNode;
  /** File input accept attribute (default ".csv") */
  accept?: string;
};

const defaultTrigger = (
  <Button variant="outline" type="button">
    <Upload className="mr-1 h-4 w-4" />
    Upload CSV
  </Button>
);

export default function CsvUploadDialog({
  title,
  description,
  templateFilename,
  templateContent,
  onSubmit,
  trigger = defaultTrigger,
  accept = ".csv",
}: CsvUploadDialogProps) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFile(null);
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", templateFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!file || isUploading) return;
    setIsUploading(true);
    onSubmit(file);
    // Brief delay so "Uploading..." is visible, then close dialog
    setTimeout(() => {
      setOpen(false);
      setFile(null);
      setIsUploading(false);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Label
            htmlFor={inputId}
            className={`block space-y-2 ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <span className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-6 transition-colors hover:border-muted-foreground/50 hover:bg-muted/50">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Choose a CSV file"}
              </span>
            </span>
            <Input
              id={inputId}
              type="file"
              accept={accept}
              className="sr-only"
              pattern={"text/csv"}
              onChange={(event) => {
                const selected =
                  event.target.files && event.target.files[0]
                    ? event.target.files[0]
                    : null;
                setFile(selected);
              }}
            />
          </Label>
          <DialogFooter className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={isUploading}
            >
              <FileDown className="mr-1 h-4 w-4" />
              Template CSV
            </Button>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
