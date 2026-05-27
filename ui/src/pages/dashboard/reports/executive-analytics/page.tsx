import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { ChartCard } from "@/components/chart-card";
import { MultiSelectFiltersDialog } from "@/components/filters/multi-select-filters-dialog";
import { KpiCardGrid, type KpiCardProps } from "@/components/kpi-card";
import KpiLoader from "@/components/kpi-loader";
import PageActionBar from "@/components/page-action-bar";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  fetchExecutiveAnalyticsKpis,
  fetchExecutiveDefectsMix,
  fetchExecutiveDefectsPareto,
  fetchExecutiveDefectsPlant,
  fetchExecutiveDefectsWarehouse,
  type ExecutiveAnalyticsKpis,
} from "@/pages/dashboard/reports/executive-analytics/executive-analytics-service";
import { ExecutiveDefectMixChart } from "@/pages/dashboard/reports/executive-analytics/executive-defect-mix-chart";
import { ExecutiveDefectsParetoChart } from "@/pages/dashboard/reports/executive-analytics/executive-defects-pareto-chart";
import type { DefectsParetoChartItem } from "@/api/generated/model/defectsParetoChartItem";
import { ExecutivePlantDefectsTable } from "@/pages/dashboard/reports/executive-analytics/executive-plant-defects-table";
import { ExecutiveWarehouseDefectsTable } from "@/pages/dashboard/reports/executive-analytics/executive-warehouse-defects-table";
import type { DefectsMixItem } from "@/api/generated/model/defectsMixItem";
import type { DefectsPlantItem } from "@/api/generated/model/defectsPlantItem";
import type { DefectsWarehouseItem } from "@/api/generated/model/defectsWarehouseItem";
import { InspectionType } from "@/api/generated/model/inspectionType";
import {
  dialogValueToExecutiveFilters,
  executiveFiltersToDialogValue,
  fetchExecutiveKpiParameters,
  mapKpiParametersToFilterSections,
  type ExecutiveAnalyticsFilters,
} from "@/pages/dashboard/reports/executive-analytics/executive-analytics-filters";
import type { KpiParametersResponse } from "@/api/generated/model/kpiParametersResponse";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Clock,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

function buildKpiCards(kpis: ExecutiveAnalyticsKpis): KpiCardProps[] {
  return [
    {
      label: "Inspection volume",
      value: kpis.inspectionVolume.toLocaleString(),
      icon: ClipboardCheck,
    },
    {
      label: "Damaged inspections",
      value: kpis.damagedInspections.toLocaleString(),
      icon: ShieldAlert,
    },
    {
      label: "Defect rate",
      value: `${kpis.defectRatePct.toFixed(1)}%`,
      icon: AlertTriangle,
    },
    {
      label: "Avg inspection time",
      value: `${kpis.avgInspectionTimeMin.toFixed(1)} min`,
      icon: Clock,
    },
    {
      label: "Pending approvals",
      value: kpis.pendingApprovals.toLocaleString(),
      icon: Inbox,
    },
  ];
}

export default function ExecutiveAnalyticsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<ExecutiveAnalyticsKpis | null>(null);
  const [warehouseDefects, setWarehouseDefects] = useState<
    DefectsWarehouseItem[]
  >([]);
  const [warehouseLoading, setWarehouseLoading] = useState(true);
  const [plantDefects, setPlantDefects] = useState<DefectsPlantItem[]>([]);
  const [plantLoading, setPlantLoading] = useState(true);
  const [defectMixItems, setDefectMixItems] = useState<DefectsMixItem[]>([]);
  const [defectMixTotal, setDefectMixTotal] = useState(0);
  const [defectMixLoading, setDefectMixLoading] = useState(true);
  const [paretoItems, setParetoItems] = useState<DefectsParetoChartItem[]>([]);
  const [paretoTotalDefects, setParetoTotalDefects] = useState(0);
  const [paretoLoading, setParetoLoading] = useState(true);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [inspectionType, setInspectionType] = useState<InspectionType>(
    InspectionType.inbound,
  );

  const [kpiParameters, setKpiParameters] =
    useState<KpiParametersResponse | null>(null);
  const [filters, setFilters] = useState<ExecutiveAnalyticsFilters>({});

  const filterOptionsLoadedRef = useRef(false);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("f");
    if (!token) {
      queueMicrotask(() => setFilters({}));
      return;
    }

    try {
      const raw = localStorage.getItem(`executive-analytics-filters:${token}`);
      if (!raw) {
        queueMicrotask(() => setFilters({}));
        return;
      }
      const parsed = JSON.parse(raw) as ExecutiveAnalyticsFilters;
      queueMicrotask(() =>
        setFilters({
          warehouseIds: parsed.warehouseIds ?? [],
          plantIds: parsed.plantIds ?? [],
          productCategoryKeys: parsed.productCategoryKeys ?? [],
          grading: parsed.grading ?? null,
        }),
      );
    } catch {
      queueMicrotask(() => setFilters({}));
    }
  }, [location.search]);

  const ensureFilterOptionsLoaded = useCallback(async () => {
    if (filterOptionsLoadedRef.current) return;
    setFilterOptionsLoading(true);
    try {
      const params = await fetchExecutiveKpiParameters();
      setKpiParameters(params);
      filterOptionsLoadedRef.current = true;
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to load filter options.";
      toast.error(message);
    } finally {
      setFilterOptionsLoading(false);
    }
  }, []);

  const handleFilterDialogOpen = useCallback(() => {
    void ensureFilterOptionsLoaded();
  }, [ensureFilterOptionsLoaded]);

  const filterValue = useMemo(
    () => executiveFiltersToDialogValue(filters),
    [filters],
  );

  const filterSections = useMemo(
    () =>
      kpiParameters ? mapKpiParametersToFilterSections(kpiParameters) : [],
    [kpiParameters],
  );

  function applyFilters(next: Record<string, string[]>) {
    const nextFilters = dialogValueToExecutiveFilters(next);

    const isEmpty = Object.keys(nextFilters).length === 0;

    if (isEmpty) {
      setFilters({});
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }

    const token = crypto.randomUUID();
    localStorage.setItem(
      `executive-analytics-filters:${token}`,
      JSON.stringify(nextFilters),
    );
    setFilters(nextFilters);
    const search = new URLSearchParams({ f: token }).toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "" },
      { replace: true },
    );
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setKpiLoading(true));
    fetchExecutiveAnalyticsKpis(filters, dateRange, inspectionType)
      .then((k) => {
        if (!cancelled) setKpis(k);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Failed to load executive KPIs.";
        toast.error(message);
        setKpis(null);
      })
      .finally(() => {
        if (!cancelled) setKpiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange, filters, inspectionType]);

  useEffect(() => {
    const controller = new AbortController();
    setWarehouseLoading(true);
    setWarehouseDefects([]);

    fetchExecutiveDefectsWarehouse(
      filters,
      dateRange,
      inspectionType,
      controller.signal,
    )
      .then((items) => {
        if (controller.signal.aborted) return;
        setWarehouseDefects(items);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        if (isAxiosError(e) && e.code === "ERR_CANCELED") return;
        const message =
          e instanceof Error
            ? e.message
            : "Failed to load warehouse defect data.";
        toast.error(message);
        setWarehouseDefects([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setWarehouseLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [dateRange, filters, inspectionType]);

  useEffect(() => {
    const controller = new AbortController();
    setPlantLoading(true);
    setPlantDefects([]);

    fetchExecutiveDefectsPlant(
      filters,
      dateRange,
      inspectionType,
      controller.signal,
    )
      .then((items) => {
        if (controller.signal.aborted) return;
        setPlantDefects(items);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        if (isAxiosError(e) && e.code === "ERR_CANCELED") return;
        const message =
          e instanceof Error ? e.message : "Failed to load plant defect data.";
        toast.error(message);
        setPlantDefects([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPlantLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [dateRange, filters, inspectionType]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setDefectMixLoading(true));
    fetchExecutiveDefectsMix(filters, dateRange, inspectionType)
      .then(({ items, totalDefects }) => {
        if (!cancelled) {
          setDefectMixItems(items);
          setDefectMixTotal(totalDefects);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Failed to load defect mix.";
        toast.error(message);
        setDefectMixItems([]);
        setDefectMixTotal(0);
      })
      .finally(() => {
        if (!cancelled) setDefectMixLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange, filters, inspectionType]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setParetoLoading(true));
    fetchExecutiveDefectsPareto(filters, dateRange, inspectionType)
      .then(({ items, totalDefects }) => {
        if (!cancelled) {
          setParetoItems(items);
          setParetoTotalDefects(totalDefects);
        }
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message =
          e instanceof Error ? e.message : "Failed to load defects pareto.";
        toast.error(message);
        setParetoItems([]);
        setParetoTotalDefects(0);
      })
      .finally(() => {
        if (!cancelled) setParetoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateRange, filters, inspectionType]);

  return (
    <div
      data-containerid="dashboard-reports-executive-analytics"
      data-testid="screen-dashboard-reports-executive-analytics"
      className="space-y-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <PageActionBar
            title="Executive Analytics"
            description="Inspection volume by location, operator, product, avg inspection time, approvals."
          />
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={inspectionType}
            onValueChange={(value) => {
              if (
                value === InspectionType.inbound ||
                value === InspectionType.outbound
              ) {
                setInspectionType(value);
              }
            }}
            aria-label="Inspection direction"
          >
            <ToggleGroupItem
              value={InspectionType.inbound}
              aria-label="Inbound"
              className="gap-1.5 px-3"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
              Inbound
            </ToggleGroupItem>
            <ToggleGroupItem
              value={InspectionType.outbound}
              aria-label="Outbound"
              className="gap-1.5 px-3"
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" aria-hidden />
              Outbound
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CalendarDateRangePicker value={dateRange} onChange={setDateRange} />
          <MultiSelectFiltersDialog
            title="Filters"
            description="Warehouse, plant, product category, and damage grading."
            sections={filterSections}
            value={filterValue}
            onApply={applyFilters}
            triggerLabel="Filters"
            onDialogOpen={handleFilterDialogOpen}
            optionsLoading={filterOptionsLoading}
          />
          <Button variant="outline" size="sm">
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          {kpiLoading ? (
            <KpiLoader count={4} />
          ) : kpis ? (
            <KpiCardGrid
              cards={buildKpiCards(kpis)}
              className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
            />
          ) : null}
        </div>

        <ExecutiveDefectsParetoChart
          items={paretoItems}
          totalDefects={paretoTotalDefects}
          isLoading={paretoLoading}
        />

        <div className="lg:col-span-12">
          <ChartCard
            title="Warehouse defects"
            description="Inspection and grading breakdown by warehouse"
            contentClassName="pt-0"
          >
            <ExecutiveWarehouseDefectsTable
              key={inspectionType}
              data={warehouseDefects}
              isLoading={warehouseLoading}
            />
          </ChartCard>
        </div>

        <div className="lg:col-span-12 xl:col-span-8">
          <ChartCard
            title="Plant defects"
            description="Inspection and grading breakdown by plant"
            contentClassName="pt-0"
          >
            <ExecutivePlantDefectsTable
              key={inspectionType}
              data={plantDefects}
              isLoading={plantLoading}
            />
          </ChartCard>
        </div>

        <div className="lg:col-span-12 xl:col-span-4">
          <ExecutiveDefectMixChart
            items={defectMixItems}
            totalDefects={defectMixTotal}
            isLoading={defectMixLoading}
          />
        </div>
      </div>
    </div>
  );
}
