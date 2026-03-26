import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import type { GalleryImage } from "@/components/image-gallery-dialog";

type InspectionImageCard = {
  key: string;
  url: string;
  filename?: string;
  section: string;
  question: string;
};

type Props = {
  reviewLoading: boolean;
  allImages: InspectionImageCard[];
  allGalleryImages: GalleryImage[];
  onOpenImage: (images: GalleryImage[], activeUrl: string) => void;
};

export function InspectionImagesTab({
  reviewLoading,
  allImages,
  allGalleryImages,
  onOpenImage,
}: Props) {
  return (
    <TabsContent value="images" className="space-y-4">
      <Card className="gap-3 py-3">
        <CardHeader className="px-3">
          <CardTitle className="text-base">
            All inspection images ({allImages.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          {reviewLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allImages.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No images available
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allImages.map((img) => (
                <button
                  key={img.key}
                  type="button"
                  onClick={() => onOpenImage(allGalleryImages, img.url)}
                  className="group rounded-md border bg-muted/20 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-t-md">
                    <img
                      src={img.url}
                      alt={img.filename ?? "Inspection image"}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="text-xs font-medium capitalize">
                      {img.section.replace("-", " ")}
                    </p>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {img.question}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
