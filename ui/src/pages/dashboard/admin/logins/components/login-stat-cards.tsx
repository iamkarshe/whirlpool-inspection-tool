import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import { cn } from "@/lib/utils";
import type {
  LoginKpiFilter,
  LoginKpis,
} from "@/pages/dashboard/admin/logins/login-types";
import { CheckCircle, LogIn, Users, XCircle } from "lucide-react";

const activeCardClass =
  "border-primary/40 bg-primary/5 dark:bg-primary/10 hover:bg-primary/5";

function buildLoginKpiCards(
  kpis: LoginKpis,
  activeFilter: LoginKpiFilter,
  onFilterChange?: (filter: LoginKpiFilter) => void,
): KpiCardProps[] {
  const clickable = Boolean(onFilterChange);

  const filterCard = (
    filter: LoginKpiFilter,
    label: string,
    value: number,
    icon: KpiCardProps["icon"],
  ): KpiCardProps => ({
    label,
    value,
    icon,
    onClick: clickable ? () => onFilterChange?.(filter) : undefined,
    className: cn(
      clickable && activeFilter === filter && activeCardClass,
    ),
  });

  return [
    filterCard("", "Total logins", kpis.totalLogins, LogIn),
    filterCard("successful", "Successful", kpis.successfulLogins, CheckCircle),
    filterCard("failed", "Failed", kpis.failedLogins, XCircle),
    {
      label: "Unique users",
      value: kpis.uniqueUsers,
      icon: Users,
    },
  ];
}

interface LoginStatCardsProps {
  kpis: LoginKpis;
  activeFilter?: LoginKpiFilter;
  onFilterChange?: (filter: LoginKpiFilter) => void;
}

export function LoginStatCards({
  kpis,
  activeFilter = "",
  onFilterChange,
}: LoginStatCardsProps) {
  return (
    <KpiCardGrid cards={buildLoginKpiCards(kpis, activeFilter, onFilterChange)} />
  );
}
