import { IconBubble } from "@/components/ui/icon-bubble";
import { ScanLine, Search, Smartphone } from "lucide-react";

export default function OpsHelpPage() {
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
              From the Home tab, tap <strong>Start new</strong>. Scan the product barcode or type
              the serial number to begin.
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-3xl border bg-card/80 p-3 shadow-sm">
          <IconBubble
            icon={Search}
            className="bg-sky-500/10 text-sky-600 dark:text-sky-300"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold">2. Check inspection status</p>
            <p className="text-xs text-muted-foreground">
              Use <strong>Search inspections</strong> to see if a product has been inspected today
              and what its latest status is.
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
              Use the <strong>Settings</strong> tab to mark the device offline when you step out and
              log out safely at the end of your shift.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

