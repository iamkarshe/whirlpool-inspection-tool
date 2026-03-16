import { ClipboardList, ChevronRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

type TodayInspection = {
  id: string;
  product: string;
  code: string;
  status: "passed" | "failed" | "pending";
  time: string;
};

const MOCK_INSPECTIONS: TodayInspection[] = [
  {
    id: "insp-001",
    product: "Front Load Washer",
    code: "FLW-839201",
    status: "passed",
    time: "09:12",
  },
  {
    id: "insp-002",
    product: "Side-by-Side Refrigerator",
    code: "SBS-448920",
    status: "failed",
    time: "09:34",
  },
  {
    id: "insp-003",
    product: "Microwave Oven",
    code: "MWO-992104",
    status: "pending",
    time: "10:02",
  },
];

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
  const [searchParams] = useSearchParams();

  const range = searchParams.get("range") ?? "today";

  const rangeLabel = (() => {
    switch (range) {
      case "yesterday":
        return "Yesterday’s inspections";
      case "week":
        return "This week’s inspections";
      case "month":
        return "This month’s inspections";
      case "inwards":
        return "Inwards inspections";
      case "outwards":
        return "Outwards inspections";
      case "faults-today":
        return "Today’s inspections with faults";
      case "faults-week":
        return "This week’s inspections with faults";
      case "custom":
        return "Custom range inspections";
      default:
        return "Today’s inspections";
    }
  })();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Tap an inspection to see full details and status.
        </p>
      </header>

      <section className="space-y-2">
        {MOCK_INSPECTIONS.map((inspection) => (
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

