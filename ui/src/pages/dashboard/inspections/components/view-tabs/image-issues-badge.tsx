import { Flag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  count: number;
  onClick?: () => void;
  className?: string;
};

export function ImageIssuesBadge({ count, onClick, className }: Props) {
  if (count <= 0) return null;

  const content = (
    <Badge
      variant="destructive"
      className={cn(
        "inline-flex items-center gap-1 border-red-300 bg-red-50 text-red-700 dark:bg-red-900/30",
        onClick ? "cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/40" : "",
        className,
      )}
    >
      <Flag className="h-3 w-3" />
      {count} flag{count > 1 ? "s" : ""}
    </Badge>
  );

  if (!onClick) return content;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md"
      aria-label={`Open ${count} image issue${count > 1 ? "s" : ""}`}
    >
      {content}
    </button>
  );
}
