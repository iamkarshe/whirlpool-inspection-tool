import type { RaiseIssuePayload, RaiseIssueTarget } from "@/components/dialogs/raise-issue-dialog";
import { RaiseIssueDialog } from "@/components/dialogs/raise-issue-dialog";
import { ImageGalleryDialog, type GalleryImage } from "@/components/image-gallery-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  inspectionId: string;
  galleryOpen: boolean;
  setGalleryOpen: (open: boolean) => void;
  galleryImages: GalleryImage[];
  activeGalleryUrl: string | null;
  setActiveGalleryUrl: (url: string | null) => void;
  raiseIssueOpen: boolean;
  setRaiseIssueOpen: (open: boolean) => void;
  onRaiseIssueSubmit: (payload: RaiseIssuePayload) => void;
  resolveOpen: boolean;
  setResolveOpen: (open: boolean) => void;
  resolvingIssueTitle?: string;
  resolveRemark: string;
  setResolveRemark: (value: string) => void;
  onResolveConfirm: () => void;
};

export function InspectionViewDialogs({
  inspectionId,
  galleryOpen,
  setGalleryOpen,
  galleryImages,
  activeGalleryUrl,
  setActiveGalleryUrl,
  raiseIssueOpen,
  setRaiseIssueOpen,
  onRaiseIssueSubmit,
  resolveOpen,
  setResolveOpen,
  resolvingIssueTitle,
  resolveRemark,
  setResolveRemark,
  onResolveConfirm,
}: Props) {
  const raiseIssueTarget: RaiseIssueTarget = activeGalleryUrl
    ? {
        type: "image",
        inspectionId,
        imageUrl: activeGalleryUrl,
        imageFilename: galleryImages.find((i) => i.url === activeGalleryUrl)?.filename,
      }
    : { type: "inspection", inspectionId };

  return (
    <>
      <ImageGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        images={galleryImages}
        activeUrl={activeGalleryUrl}
        onActiveUrlChange={(url) => setActiveGalleryUrl(url)}
        title="Inspection images"
        description="Click a thumbnail to preview, or download the selected image."
        onRaiseIssue={(img) => {
          setActiveGalleryUrl(img.url);
          setRaiseIssueOpen(true);
        }}
      />

      <RaiseIssueDialog
        open={raiseIssueOpen}
        onOpenChange={setRaiseIssueOpen}
        target={raiseIssueTarget}
        onSubmit={onRaiseIssueSubmit}
      />

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="font-medium">{resolvingIssueTitle ?? "Issue"}</div>
              <div className="text-muted-foreground mt-1 text-xs">
                Add remarks for resolution audit trail.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolve-remark">Resolution remarks</Label>
              <Textarea
                id="resolve-remark"
                value={resolveRemark}
                onChange={(e) => setResolveRemark(e.target.value)}
                placeholder="What was done to resolve this issue?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={resolveRemark.trim().length === 0}
              onClick={onResolveConfirm}
            >
              Mark as resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
