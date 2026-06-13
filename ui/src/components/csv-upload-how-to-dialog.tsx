import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type CsvUploadHowToStep = {
  title: string;
  description: string;
};

export type CsvUploadHowToDialogProps = {
  title?: string;
  intro?: string;
  steps: CsvUploadHowToStep[];
  footerNote?: string;
  trigger?: ReactNode;
};

const defaultTrigger = (
  <Button variant="ghost" size="sm" type="button">
    <CircleHelp className="mr-1 h-4 w-4" />
    How to upload
  </Button>
);

export function CsvUploadHowToDialog({
  title = "How to upload a CSV",
  intro,
  steps,
  footerNote,
  trigger = defaultTrigger,
}: CsvUploadHowToDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {intro ? <DialogDescription>{intro}</DialogDescription> : null}
        </DialogHeader>
        <ol className="grid gap-4 py-1">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {index + 1}
              </span>
              <div className="space-y-1">
                <p className="font-medium leading-snug">{step.title}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
        {footerNote ? (
          <p className="text-muted-foreground rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
            {footerNote}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
