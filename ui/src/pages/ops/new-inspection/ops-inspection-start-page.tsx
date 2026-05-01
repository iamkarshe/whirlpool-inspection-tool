import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { PAGES } from "@/endpoints";
import { OPS_BARCODE_LEN } from "@/pages/ops/new-inspection/constants";
import type { InspectionStartMode } from "@/pages/ops/new-inspection/inspection-start-shared";
import { OpsInspectionStartForm } from "@/pages/ops/new-inspection/ops-inspection-start-form";

type OpsInspectionStartPageProps = {
  mode: InspectionStartMode;
};

export function OpsInspectionStartPage({ mode }: OpsInspectionStartPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const barcode = (searchParams.get("barcode") ?? "").replace(/\s+/g, "");

  useEffect(() => {
    if (barcode.length !== OPS_BARCODE_LEN) {
      toast.error(`Valid ${OPS_BARCODE_LEN}-character barcode required.`);
      navigate(PAGES.OPS_NEW_INSPECTION, { replace: true });
    }
  }, [barcode, navigate]);

  if (barcode.length !== OPS_BARCODE_LEN) {
    return null;
  }

  return (
    <OpsInspectionStartForm
      mode={mode}
      barcode={barcode}
      embedded={false}
      onNavigateBack={() =>
        navigate(PAGES.opsNewInspectionUnitPath(barcode), { replace: false })
      }
    />
  );
}
