import { TimeDisplay } from "@/components/time-display";

export type DetailKeyValueEntry = {
  key: string;
  label: string;
  value: string;
  multiline?: boolean;
  isoDate?: string;
};

type DetailKeyValueListProps = {
  title: string;
  entries: DetailKeyValueEntry[];
  emptyText?: string;
};

export function DetailKeyValueList({
  title,
  entries,
  emptyText = "—",
}: DetailKeyValueListProps) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      {title ? (
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {title}
        </p>
      ) : null}
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        <dl className="grid gap-2">
          {entries.map((entry) => (
            <div
              key={entry.key}
              className="grid grid-cols-[120px_1fr] gap-2 text-sm"
            >
              <dt className="text-muted-foreground shrink-0">{entry.label}</dt>
              <dd
                className={
                  entry.multiline
                    ? "max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed"
                    : "break-words leading-relaxed"
                }
              >
                {entry.isoDate ? (
                  <TimeDisplay iso={entry.isoDate} />
                ) : (
                  entry.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
