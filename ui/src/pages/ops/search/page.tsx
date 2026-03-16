import { Search } from "lucide-react";

export default function OpsSearchPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Find inspection
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Search by barcode
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter or scan a product barcode or serial number to see its inspection
          history and current status.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-2 shadow-xs">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <Search className="h-5 w-5" />
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Scan or type barcode / serial"
            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tip: You can point your device&apos;s scanner at the barcode and it will
          appear here automatically.
        </p>
      </section>
    </div>
  );
}

