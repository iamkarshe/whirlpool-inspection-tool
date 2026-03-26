import { Badge } from "@/components/ui/badge";

type Props = {
  hasOpenIssues: boolean;
  failedChecksCount: number;
};

export function InspectionContextBadges({
  hasOpenIssues,
  failedChecksCount,
}: Props) {
  return (
    <>
      {hasOpenIssues ? (
        <Badge
          variant="destructive"
          className="border-red-300 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-300"
        >
          Flagged
        </Badge>
      ) : null}
      {failedChecksCount > 0 ? (
        <Badge
          variant="destructive"
          className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/25 dark:text-amber-300"
        >
          Failed checks: {failedChecksCount}
        </Badge>
      ) : null}
    </>
  );
}
