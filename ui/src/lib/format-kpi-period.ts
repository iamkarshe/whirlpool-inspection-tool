/** Format API `date` / `YYYY-MM-DD` strings for KPI period UI (no time-of-day noise). */
export function formatKpiDateRange(from: string, to: string): string {
  const d1 = new Date(`${from.trim()}T12:00:00`);
  const d2 = new Date(`${to.trim()}T12:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
    return `${from} – ${to}`;
  }
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  if (from.trim() === to.trim()) {
    return d1.toLocaleDateString(undefined, {
      weekday: "long",
      ...opts,
    });
  }
  return `${d1.toLocaleDateString(undefined, opts)} – ${d2.toLocaleDateString(undefined, opts)}`;
}
