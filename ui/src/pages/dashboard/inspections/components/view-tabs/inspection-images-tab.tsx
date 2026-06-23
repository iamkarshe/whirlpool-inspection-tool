import { Loader2 } from "lucide-react";
import { useMemo } from "react";

import type { GalleryImage } from "@/components/image-gallery-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  InspectionSideImage,
  InspectionSideImageSectionKey,
} from "@/pages/dashboard/inspections/inspection-image-utils";
import type { InspectionIssueRow } from "@/pages/dashboard/inspections/components/view-tabs/inspection-flags-tab";
import { ImageIssuesBadge } from "@/pages/dashboard/inspections/components/view-tabs/image-issues-badge";

const SIDE_IMAGE_TABS: {
  value: InspectionSideImageSectionKey;
  label: string;
}[] = [
  { value: "outer-packaging", label: "Outer packaging" },
  { value: "inner-packaging", label: "Inner packaging" },
  { value: "product", label: "Product" },
];

type Props = {
  reviewLoading: boolean;
  sideImagesByCategory: Record<InspectionSideImageSectionKey, InspectionSideImage[]>;
  onOpenImage: (images: GalleryImage[], activeUrl: string) => void;
  issueRows: InspectionIssueRow[];
  onOpenImageIssues: (imageUrl: string) => void;
};

function SideImageGrid({
  images,
  galleryImages,
  issueRows,
  onOpenImage,
  onOpenImageIssues,
}: {
  images: InspectionSideImage[];
  galleryImages: GalleryImage[];
  issueRows: InspectionIssueRow[];
  onOpenImage: (images: GalleryImage[], activeUrl: string) => void;
  onOpenImageIssues: (imageUrl: string) => void;
}) {
  if (images.length === 0) {
    return (
      <div className="text-muted-foreground py-10 text-center text-sm">
        No side images captured for this category.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((img) => (
        <button
          key={img.key}
          type="button"
          onClick={() => onOpenImage(galleryImages, img.url)}
          className="group rounded-md border bg-muted/20 text-left transition-colors hover:bg-muted/40"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-t-md bg-muted/30">
            <img
              src={img.url}
              alt={img.label}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <div className="absolute top-2 right-2">
              <ImageIssuesBadge
                count={issueRows.filter((issue) => issue.imageUrl === img.url).length}
                onClick={() => onOpenImageIssues(img.url)}
              />
            </div>
          </div>
          <div className="p-2">
            <p className="text-xs font-medium">{img.label}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export function InspectionImagesTab({
  reviewLoading,
  sideImagesByCategory,
  onOpenImage,
  issueRows,
  onOpenImageIssues,
}: Props) {
  const totalCount = useMemo(
    () =>
      SIDE_IMAGE_TABS.reduce(
        (sum, tab) => sum + sideImagesByCategory[tab.value].length,
        0,
      ),
    [sideImagesByCategory],
  );

  const galleryImagesByCategory = useMemo(() => {
    const map = {} as Record<InspectionSideImageSectionKey, GalleryImage[]>;
    for (const tab of SIDE_IMAGE_TABS) {
      map[tab.value] = sideImagesByCategory[tab.value].map(({ url, filename }) => ({
        url,
        filename,
      }));
    }
    return map;
  }, [sideImagesByCategory]);

  const defaultTab =
    SIDE_IMAGE_TABS.find((tab) => sideImagesByCategory[tab.value].length > 0)
      ?.value ?? "outer-packaging";

  return (
    <TabsContent value="images" className="space-y-4">
      <Card className="gap-3 py-3">
        <CardHeader className="px-3">
          <CardTitle className="text-base">
            Side images ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          {reviewLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : totalCount === 0 ? (
            <div className="text-muted-foreground py-10 text-center text-sm">
              No side images available for this inspection.
            </div>
          ) : (
            <Tabs defaultValue={defaultTab} className="gap-4">
              <TabsList className="h-auto w-full flex-wrap justify-start">
                {SIDE_IMAGE_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                    {tab.label}
                    <span className="text-muted-foreground text-xs tabular-nums">
                      ({sideImagesByCategory[tab.value].length})
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {SIDE_IMAGE_TABS.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-4">
                  <SideImageGrid
                    images={sideImagesByCategory[tab.value]}
                    galleryImages={galleryImagesByCategory[tab.value]}
                    issueRows={issueRows}
                    onOpenImage={onOpenImage}
                    onOpenImageIssues={onOpenImageIssues}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
