import { useMemo } from "react";
import type { ReactNode } from "react";

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
  onRaiseIssue,
  activeImageOverlay,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  images: GalleryImage[];
  activeUrl: string | null;
  onActiveUrlChange: (url: string) => void;
  onRaiseIssue?: (img: GalleryImage) => void;
  activeImageOverlay?: ReactNode;
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
  const shouldScrollThumbs = images.length > 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-4 sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {images.length === 0 ? (
          <div className="text-muted-foreground flex-1 py-10 text-center text-sm">
            No images
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-[1fr_220px]">
            <div className="relative min-h-0 overflow-auto rounded-md border bg-muted/20">
              <img
                src={active ?? ""}
                alt={activeImage?.filename ?? "Inspection image"}
                className="h-full min-h-[320px] w-full object-contain"
              />
              {activeImageOverlay ? (
                <div className="absolute bottom-2 left-2">
                  {activeImageOverlay}
                </div>
              ) : null}
            </div>

            <div className="relative min-h-0">
              <div
                className={cn(
                  "grid min-h-0 gap-2 pr-1",
                  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                  shouldScrollThumbs ? "max-h-[460px] overflow-y-auto" : "",
                )}
              >
                {images.map((img, imgIdx) => {
                  const isActive = img.url === active;
                  return (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => onActiveUrlChange(img.url)}
                      className={cn(
                        "flex h-[75px] w-full items-center gap-2 rounded-md border p-2 text-left",
                        "hover:bg-muted/40",
                        isActive
                          ? "border-primary/40 bg-muted/40"
                          : "border-border",
                      )}
                    >
                      <div className="h-full w-20 overflow-hidden rounded bg-muted">
                        <img
                          src={img.url}
                          alt={img.filename ?? "thumbnail"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">
                          Image #{imgIdx + 1}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {shouldScrollThumbs ? (
                <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 rounded-b-md bg-gradient-to-t from-background to-transparent" />
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter className="mt-2 shrink-0">
          {active && activeImage && onRaiseIssue ? (
            <Button variant="outline" onClick={() => onRaiseIssue(activeImage)}>
              Raise an issue
            </Button>
          ) : null}
          {active ? (
            <Button asChild>
              <a
                href={active}
                download={activeImage?.filename}
                target="_blank"
                rel="noreferrer"
              >
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
