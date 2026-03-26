export const inspectionViewTabItems = [
  { value: "overview", label: "Overview" },
  { value: "outer-packaging", label: "Outer Packaging" },
  { value: "inner-packaging", label: "Inner Packaging" },
  { value: "product", label: "Product Inspection" },
  { value: "images", label: "Inspection Images" },
  { value: "relationship", label: "Relationship" },
  { value: "flags", label: "Issues/Flags" },
] as const;

export function inspectionTabTitle(tab: string) {
  const match = inspectionViewTabItems.find((item) => item.value === tab);
  return match?.label ?? "Overview";
}
