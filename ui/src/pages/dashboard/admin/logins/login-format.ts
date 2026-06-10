import type { LoginIpMetadataResponse } from "@/api/generated/model/loginIpMetadataResponse";

export function formatLoginIpMetadata(
  meta?: LoginIpMetadataResponse | null,
): string {
  if (!meta) return "";
  const status = (meta.lookup_status ?? "").toLowerCase();
  if (status === "pending") return "Geo lookup pending";
  if (status === "failed") return "Geo lookup failed";
  if (status === "skipped") return "Private / local IP";

  const place = [meta.city, meta.region, meta.country_name ?? meta.country_code]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");

  if (place && meta.isp?.trim()) return `${place} · ${meta.isp.trim()}`;
  if (place) return place;
  if (meta.isp?.trim()) return meta.isp.trim();
  return "";
}
