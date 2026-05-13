/**
 * Release note entry for the Whirlpool Inspection Tool.
 */
export type ReleaseFeatureType = "feature" | "fix" | "improvement" | "chore";

export interface ReleaseFeature {
  text: string;
  type?: ReleaseFeatureType;
}

export interface ReleaseNote {
  id: string;
  version: string;
  releasedAt: string;
  title: string;
  features: ReleaseFeature[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    id: "v0.0.3",
    version: "v0.0.3",
    releasedAt: "2026-05-13",
    title: "Operations workflow update",
    features: [
      { text: "Updated mandatory inspection image capture by packaging and product section", type: "feature" },
      {
        text: "Added gallery-or-camera source picker for inspection uploads",
        type: "feature",
      },
      { text: "Improved Ops inspection detail metadata, side images, and captured image grouping", type: "improvement" },
      { text: "Added auth build badge with cache/storage clear reload action", type: "feature" },
      { text: "Added New Delhi fallback coordinates when browser location is unavailable", type: "fix" },
    ],
  },
  {
    id: "v0.0.2",
    version: "v0.0.2",
    releasedAt: "2026-05-08",
    title: "Inspection and analytics refinements",
    features: [
      { text: "Moved supplier plant capture to inbound inspections", type: "fix" },
      { text: "Updated Ops form step order and copy", type: "improvement" },
      { text: "Added date range API wiring for operations and executive analytics", type: "improvement" },
      { text: "Removed extra list fetch from Ops inspection detail page", type: "fix" },
    ],
  },
  {
    id: "v0.0.1",
    version: "v0.0.1",
    releasedAt: "2026-03-05",
    title: "Initial release",
    features: [
      { text: "Initial dashboard with analytics overview", type: "feature" },
      {
        text: "Masters for users, product categories, products and warehouses",
        type: "feature",
      },
      { text: "Inspections, logins, devices, and release notes modules", type: "feature" },
    ],
  },
];

export function getReleaseNotes(): Promise<ReleaseNote[]> {
  return Promise.resolve([...releaseNotes]);
}

export function getReleaseNoteById(id: string): Promise<ReleaseNote | null> {
  const note = releaseNotes.find((n) => n.id === id) ?? null;
  return Promise.resolve(note ? { ...note } : null);
}
