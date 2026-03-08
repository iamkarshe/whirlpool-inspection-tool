import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LoginKpis } from "@/pages/dashboard/admin/logins/login-service";
import {
  LogIn,
  CheckCircle,
  XCircle,
  Users,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const statConfig = [
  {
    name: "Total logins",
    stat: (k: LoginKpis) => k.totalLogins.toLocaleString(),
    change: (k: LoginKpis) => k.totalChange,
    changeType: (k: LoginKpis) => k.totalChangeType,
    icon: LogIn,
  },
  {
    name: "Successful",
    stat: (k: LoginKpis) => k.successfulLogins.toLocaleString(),
    change: (k: LoginKpis) => k.successChange,
    changeType: (k: LoginKpis) => k.successChangeType,
    icon: CheckCircle,
  },
  {
    name: "Failed",
    stat: (k: LoginKpis) => k.failedLogins.toLocaleString(),
    change: (k: LoginKpis) => k.failedChange,
    changeType: (k: LoginKpis) => k.failedChangeType,
    icon: XCircle,
  },
  {
    name: "Unique users",
    stat: (k: LoginKpis) => k.uniqueUsers.toLocaleString(),
    change: (k: LoginKpis) => k.usersChange,
    changeType: (k: LoginKpis) => k.usersChangeType,
    icon: Users,
  },
];

interface LoginStatCardsProps {
  kpis: LoginKpis;
}

export function LoginStatCards({ kpis }: LoginStatCardsProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statConfig.map(({ name, stat, change, changeType, icon: Icon }) => {
        const type = changeType(kpis);
        return (
          <Card key={name} className="w-full p-6 py-4">
            <CardContent className="p-0">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-4 w-4 shrink-0" />
                  {name}
                </dt>
                <Badge
                  variant="outline"
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 ps-2.5 text-xs font-medium",
                    type === "positive"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                  )}
                >
                  {type === "positive" ? (
                    <TrendingUp className="mr-0.5 -ml-1 h-5 w-5 shrink-0 self-center text-green-500" />
                  ) : (
                    <TrendingDown className="mr-0.5 -ml-1 h-5 w-5 shrink-0 self-center text-red-500" />
                  )}
                  <span className="sr-only">
                    {type === "positive" ? "Increased" : "Decreased"} by
                  </span>
                  {change(kpis)}
                </Badge>
              </div>
              <dd className="text-foreground mt-2 text-3xl font-semibold">
                {stat(kpis)}
              </dd>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
