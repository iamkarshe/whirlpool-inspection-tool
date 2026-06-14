import type { ReleaseFeatureResponse } from "@/api/generated/model/releaseFeatureResponse";
import type { ReleaseFeatureResponseType } from "@/api/generated/model/releaseFeatureResponseType";
import type { ReleaseNoteResponse } from "@/api/generated/model/releaseNoteResponse";

export function formatReleaseDate(releasedAt: string): string {
  const trimmed = releasedAt.trim();
  if (!trimmed) return "—";

  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return trimmed;

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function countFeatureTypes(
  features: ReleaseNoteResponse["features"],
): Partial<Record<NonNullable<ReleaseFeatureResponseType>, number>> {
  const counts: Partial<
    Record<NonNullable<ReleaseFeatureResponseType>, number>
  > = {};

  for (const feature of features ?? []) {
    if (!feature.type) continue;
    counts[feature.type] = (counts[feature.type] ?? 0) + 1;
  }

  return counts;
}

/** Newest change bullet when API lists features newest first. */
export function getHeadFeature(
  release: ReleaseNoteResponse,
): ReleaseFeatureResponse | null {
  for (const feature of release.features ?? []) {
    if (feature.text?.trim() || feature.hash?.trim()) return feature;
  }
  return null;
}

/** First feature hash in a release (newest bullet when API lists newest first). */
export function getHeadFeatureHash(
  release: ReleaseNoteResponse,
): string | null {
  return getHeadFeature(release)?.hash?.trim() ?? null;
}

export function formatLatestHashLabel(hash: string): string {
  const short = hash.trim().slice(0, 7);
  return short ? `Latest #${short}` : "Latest";
}
