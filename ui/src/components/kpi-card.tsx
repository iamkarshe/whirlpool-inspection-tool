import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export type KpiChangeType = "positive" | "negative";

export interface KpiCardProps {
  /** Card label (e.g. "Total inspections") */
  label: string;
  /** Main value to display (e.g. "1,234" or "98.5%") */
  value: string | number;
  /** Optional trend text (e.g. "+12.1%") */
  change?: string;
  /** When provided with change, styles the trend badge */
  changeType?: KpiChangeType;
  /** Optional icon shown next to the label */
  icon?: LucideIcon;
  /** Optional link target; when provided card is clickable */
  href?: string;
  /** Optional click handler; when provided card is clickable */
  onClick?: () => void;
  /** Optional extra class for the card */
  className?: string;
}

export function KpiCard({
  label,
  value,
  change,
  changeType,
  icon: Icon,
  href,
  onClick,
  className,
}: KpiCardProps) {
  const displayValue =
    typeof value === "number" ? value.toLocaleString() : value;
  const showChange = change != null && changeType != null;
  const valueRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const el = valueRef.current;
      if (!el) return;
      setHasOverflow(el.scrollWidth > el.clientWidth + 1);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [displayValue]);

  const card = (
    <Card
      title={label}
      className={cn(
        "group w-full p-3 transition-colors duration-200",
        "border-border hover:bg-muted/40 hover:border-primary/20",
        href || onClick ? "cursor-pointer" : null,
        className,
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
            {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
            {label}
          </dt>
          {showChange ? (
            <Badge
              variant="outline"
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 ps-2.5 text-xs font-medium",
                changeType === "positive"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
              )}
            >
              {changeType === "positive" ? (
                <TrendingUp className="mr-0.5 -ml-1 h-5 w-5 shrink-0 self-center text-green-500" />
              ) : (
                <TrendingDown className="mr-0.5 -ml-1 h-5 w-5 shrink-0 self-center text-red-500" />
              )}
              <span className="sr-only">
                {changeType === "positive" ? "Increased" : "Decreased"} by
              </span>
              {change}
            </Badge>
          ) : null}
        </div>
        <dd
          ref={valueRef}
          className={cn(
            "text-foreground mt-2 text-3xl font-semibold",
            "relative overflow-hidden whitespace-nowrap pr-10",
            hasOverflow
              ? "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-12 after:bg-gradient-to-l after:from-background after:to-transparent after:transition-colors after:duration-200 group-hover:after:from-muted/40"
              : "",
          )}
        >
          {displayValue}
        </dd>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link to={href} className="block no-underline">
      {card}
    </Link>
  ) : onClick ? (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {card}
    </button>
  ) : (
    card
  );
}

export interface KpiCardGridProps {
  /** Array of KPI card configs; each is passed to KpiCard */
  cards: KpiCardProps[];
  /** Optional grid class (default: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) */
  className?: string;
}

export function KpiCardGrid({ cards, className }: KpiCardGridProps) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}
