import InspectionsDataTable from "@/pages/dashboard/inspections/inspections-data-table";
import {
  getInspectionsByDeviceId,
  type Inspection,
} from "@/pages/dashboard/inspections/inspection-service";
import type { Device } from "@/pages/dashboard/admin/devices/device-service";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import SkeletonTable from "@/components/skeleton7";

type DeviceViewContext = { device: Device };

export default function DeviceViewInspectionsPage() {
  const { device } = useOutletContext<DeviceViewContext>();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getInspectionsByDeviceId(device.id)
      .then(setInspections)
      .finally(() => setIsLoading(false));
  }, [device.id]);

  if (isLoading) {
    return <SkeletonTable />;
  }

  return (
    <InspectionsDataTable
      data={inspections}
      hideDeviceColumn
    />
  );
}
