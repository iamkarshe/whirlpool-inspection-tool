function escapeCsvCell(value: unknown) {
  if (value == null) return "";
  const s = String(value);
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(
  rows: Array<Record<string, unknown>>,
  headers: string[],
): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const lines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h])).join(","),
  );
  return [headerLine, ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

