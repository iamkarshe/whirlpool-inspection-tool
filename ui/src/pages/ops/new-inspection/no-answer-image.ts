import type { NoAnswerImageSlot } from "@/pages/ops/new-inspection/inspection-draft-storage";

/** Browser display URL: API-relative paths use `VITE_API_BASE_URL`. */
export function noAnswerImageDisplaySrc(slot: NoAnswerImageSlot): string {
  if (slot.url && (slot.url.startsWith("data:") || slot.url.startsWith("blob:"))) {
    return slot.url;
  }
  const path = slot.path ?? slot.url;
  if (!path) return "";
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  const base = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  if (!base) return path.startsWith("/") ? path : `/${path}`;
  const rel = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

/** Paths to send on `checklist_answers[].image_path` (server-relative only). */
export function noAnswerImageSubmitPaths(slots: NoAnswerImageSlot[]): string[] {
  return slots
    .map((s) => s.path)
    .filter(
      (p): p is string =>
        typeof p === "string" &&
        p.length > 0 &&
        !p.startsWith("data:") &&
        !p.startsWith("blob:"),
    );
}

export function noAnswerImageHasServerPath(slot: NoAnswerImageSlot): boolean {
  return noAnswerImageSubmitPaths([slot]).length > 0;
}
