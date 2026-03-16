import { useParams } from "react-router-dom";

export default function OpsInspectionDetailPage() {
  const { id } = useParams();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Inspection detail
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          Inspection {id}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here you&apos;ll see product, checks, photos, and final status.
        </p>
      </header>
    </div>
  );
}

