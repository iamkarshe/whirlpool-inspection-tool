import { IconBubble } from "@/components/ui/icon-bubble";
import { useSessionUser } from "@/hooks/use-session-user";
import { isOpsManagerRole } from "@/lib/ops-role";
import {
  ClipboardCheck,
  ClipboardList,
  ScanLine,
  Search,
  Smartphone,
} from "lucide-react";

export default function OpsHelpPage() {
  const sessionUser = useSessionUser();
  const isManager = isOpsManagerRole(sessionUser?.role);

  if (isManager) {
    return (
      <div className="space-y-4">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">
            How to use the Ops app as a warehouse manager: review work, read
            KPIs, and look up units.
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
            <IconBubble
              icon={ClipboardCheck}
              className="bg-violet-500/10 text-violet-600 dark:text-violet-300"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold">1. Review the queue</p>
              <p className="text-xs text-muted-foreground">
                On <strong>Home</strong>, open <strong>Review queue</strong> to
                approve or reject inspections your operators submitted. Work
                through the list until the count is clear.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
            <IconBubble
              icon={ClipboardList}
              className="bg-violet-500/10 text-violet-600 dark:text-violet-300"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold">2. Inspections (KPIs)</p>
              <p className="text-xs text-muted-foreground">
                Use the bottom <strong>Inspections</strong> tab for team KPIs.
                Tap the period banner to change the reporting window, then open
                a metric to see the underlying inspection list.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
            <IconBubble
              icon={Search}
              className="bg-amber-500/10 text-amber-600 dark:text-amber-300"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold">3. Search by barcode</p>
              <p className="text-xs text-muted-foreground">
                From <strong>Home</strong>, tap <strong>Search inspection</strong>{" "}
                (same barcode length as operators). You only open existing
                records—managers do not start new inbound/outbound flows here.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
            <IconBubble
              icon={Smartphone}
              className="bg-violet-500/10 text-violet-600 dark:text-violet-300"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold">4. Account</p>
              <p className="text-xs text-muted-foreground">
                Use the <strong>Account</strong> tab to review your profile, sign
                out safely at end of shift, and keep the device state in line
                with how you work.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Three simple steps to complete inspections like an expert.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
          <IconBubble
            icon={ScanLine}
            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold">1. Start a new inspection</p>
            <p className="text-xs text-muted-foreground">
              From <strong>Home</strong>, tap <strong>New Inspection</strong> or
              use the bottom <strong>New</strong> tab. Scan the unit barcode or
              type it to continue to inbound or outbound.
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
          <IconBubble
            icon={Search}
            className="bg-amber-500/10 text-amber-600 dark:text-amber-300"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold">2. Search an inspection</p>
            <p className="text-xs text-muted-foreground">
              From <strong>Home</strong>, tap <strong>Search inspection</strong>{" "}
              to open barcode lookup. You will see the unit and can open
              details for existing inbound or outbound inspections (lookup
              only).
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
          <IconBubble
            icon={Smartphone}
            className="bg-violet-500/10 text-violet-600 dark:text-violet-300"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold">3. Keep your device in sync</p>
            <p className="text-xs text-muted-foreground">
              Use the <strong>Account</strong> tab to review your profile, sign
              out safely at the end of your shift, and manage how the device is
              used on the floor.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
