export default function OpsAccountPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Signed in as
            </p>
            <p className="mt-1 text-base font-semibold">Warehouse Operator</p>
            <p className="text-xs text-muted-foreground">whirlpool.operator@example.com</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            WO
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Device fingerprint
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Full name</span>
            <span className="font-medium">Warehouse Operator</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Mobile fingerprint</span>
            <span className="font-mono text-xs">
              a1c9-92ff-4b7e-ops1
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Active IP</span>
            <span className="font-mono text-xs">192.168.10.24</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Central server</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}


