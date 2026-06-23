import type { InspectionSectionKey } from "@/pages/dashboard/inspections/inspection-types";

export type InspectionSideImageSectionKey = Exclude<
  InspectionSectionKey,
  "device"
>;

export type InspectionSideImage = {
  key: string;
  url: string;
  filename: string;
  label: string;
};

export const INSPECTION_SIDE_IMAGE_LABELS: Record<
  InspectionSideImageSectionKey,
  string[]
> =
  {
    "outer-packaging": [
      "Top",
      "Side 1",
      "Side 2",
      "Side 3",
      "Side 4",
      "Barcode sticker",
      "MRP label",
      "Energy label",
    ],
    "inner-packaging": [
      "Top",
      "Side 1",
      "Side 2",
      "Side 3",
      "Side 4",
      "Accessories",
    ],
    product: ["Top", "Side 1", "Side 2", "Side 3", "Side 4"],
  };

export function inspectionImageUrl(pathOrUrl: string): string {
  const value = (pathOrUrl ?? "").trim();
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const relative = value.startsWith("/") ? value : `/${value}`;
  if (!base) return relative;
  return `${base}${relative}`;
}

export function buildInspectionSideImages(
  paths: string[] | undefined,
  section: InspectionSideImageSectionKey,
): InspectionSideImage[] {
  const labels = INSPECTION_SIDE_IMAGE_LABELS[section];

  return (paths ?? [])
    .map((path, index) => {
      const url = inspectionImageUrl(path);
      if (!url) return null;

      const label = labels[index] ?? `Image ${index + 1}`;
      return {
        key: `side-${section}-${index}-${path}`,
        url,
        filename: label,
        label,
      };
    })
    .filter((image): image is InspectionSideImage => image !== null);
}
