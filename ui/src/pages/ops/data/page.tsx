import { ArrowUpRight, BarChart3, Boxes, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function OpsDataPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate("/ops/today-inspections")}
          className="group rounded-3xl border bg-emerald-500/5 p-3 text-left shadow-sm ring-1 ring-emerald-500/10 transition-colors hover:bg-emerald-500/10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Today
          </p>
          <p className="mt-1 text-2xl font-semibold">18</p>
          <p className="text-[11px] text-muted-foreground">
            scans completed this shift
          </p>
        </button>
        <button
          type="button"
          onClick={() => navigate("/ops/search")}
          className="group rounded-3xl border bg-sky-500/5 p-3 text-left shadow-sm ring-1 ring-sky-500/10 transition-colors hover:bg-sky-500/10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
            Yesterday
          </p>
          <p className="mt-1 text-2xl font-semibold">24</p>
          <p className="text-[11px] text-muted-foreground">
            compare with today&apos;s pace
          </p>
        </button>
        <button
          type="button"
          onClick={() => navigate("/ops/search")}
          className="group rounded-3xl border bg-amber-500/5 p-3 text-left shadow-sm ring-1 ring-amber-500/10 transition-colors hover:bg-amber-500/10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
            This week
          </p>
          <p className="mt-1 text-2xl font-semibold">96</p>
          <p className="text-[11px] text-muted-foreground">
            total inspections this week
          </p>
        </button>
        <button
          type="button"
          onClick={() => navigate("/ops/search")}
          className="group rounded-3xl border bg-violet-500/5 p-3 text-left shadow-sm ring-1 ring-violet-500/10 transition-colors hover:bg-violet-500/10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
            This month
          </p>
          <p className="mt-1 text-2xl font-semibold">312</p>
          <p className="text-[11px] text-muted-foreground">
            inspections logged on this device
          </p>
        </button>
      </section>

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Inwards vs Outwards</p>
              <p className="text-xs text-muted-foreground">
                Balance of products coming in vs going out.
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <button
            type="button"
            onClick={() => navigate("/ops/search")}
            className="space-y-0.5 rounded-2xl bg-muted/40 p-2 text-left"
          >
            <p className="text-xs text-muted-foreground">Inwards</p>
            <p className="text-base font-semibold">64</p>
            <p className="text-[11px] text-muted-foreground">
              products received &amp; inspected
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/ops/search")}
            className="space-y-0.5 rounded-2xl bg-muted/40 p-2 text-left"
          >
            <p className="text-xs text-muted-foreground">Outwards</p>
            <p className="text-base font-semibold">32</p>
            <p className="text-[11px] text-muted-foreground">
              products cleared to dispatch
            </p>
          </button>
        </div>
      </section>

      <section className="space-y-2 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300">
              <TriangleAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Inspections with faults</p>
              <p className="text-xs text-muted-foreground">
                Items that were blocked or need attention.
              </p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <button
            type="button"
            onClick={() => navigate("/ops/search")}
            className="space-y-0.5 rounded-2xl bg-muted/40 p-2 text-left"
          >
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-base font-semibold">2</p>
            <p className="text-[11px] text-muted-foreground">
              with critical or major issues
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/ops/search")}
            className="space-y-0.5 rounded-2xl bg-muted/40 p-2 text-left"
          >
            <p className="text-xs text-muted-foreground">This week</p>
            <p className="text-base font-semibold">7</p>
            <p className="text-[11px] text-muted-foreground">
              needing supervisor review
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}


