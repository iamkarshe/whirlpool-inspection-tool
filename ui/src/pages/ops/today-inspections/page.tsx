import { ChevronRight, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { OpsListEmptyState } from "@/components/ops/ops-list-empty-state";
import { opsListEmptySectionClassName } from "@/components/ops/ops-list-section-classes";
import { OpsListHint } from "@/components/ops/ops-list-hint";
import { OpsInspectionSkeleton } from "@/components/ops/ops-inspection-skeleton";
import {
  getInspectionQuestionResults,
  getInspections,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";

type TodayInspection = {
  id: string;
  product: string;
  code: string;
  status: "passed" | "failed" | "pending";
  time: string;
};

function toTodayTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function toTodayInspection(
  inspection: Inspection,
): Promise<TodayInspection> {
  const [outer, inner, product] = await Promise.all([
    getInspectionQuestionResults(inspection.id, "outer-packaging"),
    getInspectionQuestionResults(inspection.id, "inner-packaging"),
    getInspectionQuestionResults(inspection.id, "product"),
  ]);
  const failed = [...outer, ...inner, ...product].some(
    (r) => r.status === "fail",
  );
  return {
    id: inspection.id,
    product: inspection.product_category_name ?? inspection.checklist_name,
    code: inspection.product_serial,
    status: failed ? "failed" : "passed",
    time: toTodayTime(inspection.created_at),
  };
}

function statusBadge(status: TodayInspection["status"]) {
  if (status === "passed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Passed
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Pending
    </span>
  );
}

export default function OpsTodayInspectionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TodayInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getInspections()
      .then(async (list) => {
        const mapped = await Promise.all(list.map(toTodayInspection));
        if (!cancelled) setRows(mapped);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const empty = !loading && rows.length === 0;

  return (
    <div className="space-y-4">
      <OpsListHint show={!loading && rows.length > 0}>
        Tap an inspection to see full details and status.
      </OpsListHint>

      <section className={opsListEmptySectionClassName(loading, empty)}>
        {loading ? <OpsInspectionSkeleton variant="list" count={4} /> : null}
        {empty ? (
          <OpsListEmptyState
            title="No inspections yet"
            description="Completed checks will appear here so you can open details in one tap."
          />
        ) : null}
        {rows.map((inspection) => (
          <button
            key={inspection.id}
            type="button"
            onClick={() => navigate(`/ops/inspections/${inspection.id}`)}
            className="flex w-full items-center justify-between gap-3 rounded-3xl border bg-card/80 p-3 text-left shadow-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{inspection.product}</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {inspection.code}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Logged at {inspection.time}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {statusBadge(inspection.status)}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}
