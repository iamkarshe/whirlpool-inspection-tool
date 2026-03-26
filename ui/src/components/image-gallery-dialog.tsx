import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  url: string;
  filename?: string;
};

export function ImageGalleryDialog({
  open,
  onOpenChange,
  title = "Images",
  description,
  images,
  activeUrl,
  onActiveUrlChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  images: GalleryImage[];
  activeUrl: string | null;
  onActiveUrlChange: (url: string) => void;
}) {
  const active = useMemo(() => {
    const fallback = images[0]?.url ?? null;
    if (!activeUrl) return fallback;
    return images.some((i) => i.url === activeUrl) ? activeUrl : fallback;
  }, [activeUrl, images]);

  const activeImage = useMemo(
    () => images.find((i) => i.url === active) ?? null,
    [active, images],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {images.length === 0 ? (
          <div className="text-muted-foreground py-10 text-center text-sm">
            No images
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="rounded-md border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active ?? ""}
                alt={activeImage?.filename ?? "Inspection image"}
                className="h-[420px] w-full rounded-md object-contain"
              />
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-xs">
                {activeImage?.filename ?? "Selected image"}
              </div>
              <div className="grid gap-2 overflow-auto pr-1 md:max-h-[420px]">
                {images.map((img) => {
                  const isActive = img.url === active;
                  return (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => onActiveUrlChange(img.url)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border p-2 text-left",
                        "hover:bg-muted/40",
                        isActive ? "border-primary/40 bg-muted/40" : "border-border",
                      )}
                    >
                      <div className="h-10 w-14 overflow-hidden rounded bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={img.filename ?? "thumbnail"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">
                          {img.filename ?? "image"}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {img.url}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {active ? (
            <Button asChild>
              <a href={active} download={activeImage?.filename} target="_blank" rel="noreferrer">
                Download
              </a>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

