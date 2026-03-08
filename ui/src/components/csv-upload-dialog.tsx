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
import { FileDown, Upload } from "lucide-react";
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

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setFile(null);
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
    if (file) {
      onSubmit(file);
    }
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
          <div className="space-y-2">
            <Label htmlFor={inputId}>CSV file</Label>
            <Input
              id={inputId}
              type="file"
              accept={accept}
              onChange={(event) => {
                const selected =
                  event.target.files && event.target.files[0]
                    ? event.target.files[0]
                    : null;
                setFile(selected);
              }}
            />
          </div>
          <DialogFooter className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
            >
              <FileDown className="mr-1 h-4 w-4" />
              Template CSV
            </Button>
            <Button type="submit" disabled={!file}>
              Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
