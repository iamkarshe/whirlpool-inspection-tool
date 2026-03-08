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
    id: "v1.0.0",
    version: "v1.0.0",
    releasedAt: "2026-03-05",
    title: "Initial release",
    features: [
      { text: "Initial dashboard with analytics overview", type: "feature" },
      {
        text: "Masters for users, product categories, products and warehouses",
        type: "feature",
      },
      { text: "CSV import templates and improved empty states", type: "improvement" },
      { text: "Inspections, logins, and devices modules", type: "feature" },
      { text: "Operations and Executive analytics with charts", type: "feature" },
      { text: "Release notes and system info in sidebar", type: "chore" },
    ],
  },
  {
    id: "v0.9.0",
    version: "v0.9.0",
    releasedAt: "2026-02-28",
    title: "Beta",
    features: [
      { text: "Admin: users, devices, logins, integrations, logs", type: "feature" },
      { text: "Device view with details, inspections, logins, users", type: "feature" },
      { text: "User view with devices, inspections, logins", type: "feature" },
      { text: "Warehouse view and master data", type: "feature" },
      { text: "AWS S3 integration configuration", type: "feature" },
      { text: "Fixed date range filter on data tables", type: "fix" },
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
