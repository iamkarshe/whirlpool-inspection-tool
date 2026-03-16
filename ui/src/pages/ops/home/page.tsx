import { Button } from "@/components/ui/button";

export default function OpsHomePage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Warehouse Ops
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Morning, Operator
        </h1>
        <p className="text-sm text-muted-foreground">
          Start a new inspection or continue where you left off.
        </p>
      </header>

      <section className="space-y-3">
        <Button className="w-full rounded-2xl py-6 text-base font-semibold">
          Start new inspection
        </Button>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Today&apos;s progress
              </p>
              <p className="mt-1 text-2xl font-semibold">0 / 12</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Inspections completed</p>
              <p className="mt-1 text-[11px]">Syncs automatically when online</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
