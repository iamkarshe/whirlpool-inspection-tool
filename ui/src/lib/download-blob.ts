export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function readBlobErrorDetail(
  blob: Blob,
  fallback: string,
): Promise<string> {
  if (!blob.type.includes("json") && blob.size > 512) return fallback;
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed === "object" && parsed !== null && "detail" in parsed) {
      const detail = (parsed as { detail: unknown }).detail;
      if (typeof detail === "string" && detail.length > 0) return detail;
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0] as { msg?: string; type?: string };
        const msg = first?.msg ?? first?.type;
        if (typeof msg === "string" && msg.length > 0) return msg;
      }
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}
