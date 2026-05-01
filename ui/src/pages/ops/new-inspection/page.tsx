import { Barcode, ScanLine } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import type { BarcodeParseResponse } from "@/api/generated/model/barcodeParseResponse";
import type { InspectionWithChecklistPayload } from "@/api/generated/model/inspectionWithChecklistPayload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAGES } from "@/endpoints";
import {
  opsInspectionApiError,
  parseInspectionBarcode,
} from "@/services/ops-inspections-api";

const BARCODE_LEN = 16;

function getDefaultScannerEnabled() {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const smallViewport = window.matchMedia("(max-width: 768px)").matches;
  return coarsePointer || smallViewport;
}

function summarizeInspection(ins: InspectionWithChecklistPayload): string {
  const pass = ins.checklist_pass_total ?? 0;
  const fail = ins.checklist_fail_total ?? 0;
  return `${pass} pass · ${fail} fail`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OpsNewInspectionPage() {
  const [, setSearchParams] = useSearchParams();
  const autoParsedRef = useRef(false);
  const parseRequestIdRef = useRef(0);

  const [inspectionCode, setInspectionCode] = useState(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    return (params.get("barcode") ?? "").replace(/\s+/g, "").slice(0, BARCODE_LEN);
  });
  const [parsed, setParsed] = useState<BarcodeParseResponse | null>(null);
  const [parsing, setParsing] = useState(false);
  const [scannerEnabled, setScannerEnabled] = useState(() =>
    getDefaultScannerEnabled(),
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanErrorOpen, setScanErrorOpen] = useState(false);

  const isCodeValid = inspectionCode.trim().length === BARCODE_LEN;

  const runParse = useCallback(
    async (barcode: string) => {
      const normalized = barcode.replace(/\s+/g, "").slice(0, BARCODE_LEN);
      if (normalized.length !== BARCODE_LEN) return;

      const reqId = ++parseRequestIdRef.current;
      setParsing(true);
      try {
        const res = await parseInspectionBarcode(normalized);
        if (parseRequestIdRef.current !== reqId) return;
        setParsed(res);
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("barcode", normalized);
            return next;
          },
          { replace: true },
        );
      } catch (e: unknown) {
        if (parseRequestIdRef.current !== reqId) return;
        setParsed(null);
        toast.error(opsInspectionApiError(e, "Could not read this barcode."));
      } finally {
        if (parseRequestIdRef.current === reqId) setParsing(false);
      }
    },
    [setSearchParams],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("barcode") ?? "")
      .replace(/\s+/g, "")
      .slice(0, BARCODE_LEN);
    if (
      fromUrl.length === BARCODE_LEN &&
      !autoParsedRef.current
    ) {
      autoParsedRef.current = true;
      setInspectionCode(fromUrl);
      void runParse(fromUrl);
    }
  }, [runParse]);

  const startInboundTo = `${PAGES.OPS_NEW_INSPECTION_INBOUND}?barcode=${encodeURIComponent(inspectionCode.trim())}`;
  const startOutboundTo = `${PAGES.OPS_NEW_INSPECTION_OUTBOUND}?barcode=${encodeURIComponent(inspectionCode.trim())}`;

  const inbound = parsed?.inbound_inspection ?? null;
  const outbound = parsed?.outbound_inspection ?? null;
  const showsTypeChoice =
    parsed && inbound === null && outbound === null;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          New inspection
        </p>
        <p className="text-sm text-muted-foreground">
          Scan or enter the 16-character barcode, then confirm the product before
          starting inbound or outbound.
        </p>
      </header>

      <section className="space-y-3 rounded-3xl border bg-card/80 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => {
              setScannerEnabled((prev) => !prev);
              setScanError(null);
            }}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
              scannerEnabled
                ? "border-primary/40 bg-primary/10"
                : "bg-muted/40 hover:bg-muted"
            }`}
          >
            <Barcode className="h-5 w-5 text-muted-foreground" />
            {scannerEnabled
              ? "Stop scan for manual entry"
              : "Scan QR / barcode"}
          </button>
        </div>

        {scannerEnabled ? (
          <div className="space-y-2 rounded-2xl border bg-background p-2">
            <div className="overflow-hidden rounded-xl border">
              <Scanner
                onScan={(detectedCodes) => {
                  const raw = detectedCodes[0]?.rawValue ?? "";
                  if (!raw) return;
                  const normalized = raw.replace(/\s+/g, "").slice(0, BARCODE_LEN);
                  setInspectionCode(normalized);
                  if (normalized.length === BARCODE_LEN) {
                    setScannerEnabled(false);
                    void runParse(normalized);
                  }
                }}
                onError={(error) => {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Unable to access camera";
                  setScanError(message);
                  setScanErrorOpen(true);
                }}
                constraints={{ facingMode: "environment" }}
                formats={[
                  "qr_code",
                  "code_128",
                  "ean_13",
                  "ean_8",
                  "upc_a",
                  "upc_e",
                  "itf",
                ]}
                components={{ finder: true }}
              />
            </div>
            {scanError ? (
              <p className="text-xs text-destructive">{scanError}</p>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Point the camera at the barcode. We use the first 16 characters.
              </p>
            )}
          </div>
        ) : null}

        <div className="space-y-1 rounded-2xl border border-dashed bg-muted/20 p-3">
          <label
            htmlFor="manual-code"
            className="block w-full text-center text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
          >
            Enter manually
          </label>
          <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2">
            <ScanLine className="h-4 w-4 text-muted-foreground" />
            <input
              id="manual-code"
              type="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              value={inspectionCode}
              onChange={(event) =>
                setInspectionCode(
                  event.target.value.replace(/\s+/g, "").slice(0, BARCODE_LEN),
                )
              }
              placeholder={`Enter ${BARCODE_LEN} characters`}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            {inspectionCode.length}/{BARCODE_LEN} characters
          </p>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={!isCodeValid || parsing}
          onClick={() => void runParse(inspectionCode.trim())}
        >
          {parsing ? "Looking up…" : "Look up product"}
        </Button>
      </section>

      <Dialog open={scanErrorOpen} onOpenChange={setScanErrorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scanner unavailable</DialogTitle>
            <DialogDescription>
              {scanError ?? "Unable to initialize camera scanner."}
            </DialogDescription>
          </DialogHeader>
          <div className="text-muted-foreground text-sm">
            Check camera permissions and ensure no other app is using the camera.
            You can continue with manual code entry.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanErrorOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {parsed ? (
        <div className="space-y-4">
          <section className="rounded-3xl border bg-card/80 p-4 shadow-sm">
            <p className="text-sm font-semibold">Product</p>
            <p className="mt-2 text-base font-medium leading-snug">
              {parsed.product.material_description}
            </p>
            <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <dt className="font-medium text-foreground">Category</dt>
                <dd>{parsed.product_category.name}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <dt className="font-medium text-foreground">Material</dt>
                <dd>{parsed.product.material_code}</dd>
              </div>
              {parsed.product_unit?.barcode ? (
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <dt className="font-medium text-foreground">Unit barcode</dt>
                  <dd className="font-mono">{parsed.product_unit.barcode}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          {(inbound || outbound) && (
            <section className="space-y-2">
              <p className="text-sm font-semibold">Existing inspections</p>
              <div className="space-y-2">
                {inbound ? (
                  <ExistingInspectionRow
                    label="Inbound"
                    inspection={inbound}
                  />
                ) : null}
                {outbound ? (
                  <ExistingInspectionRow
                    label="Outbound"
                    inspection={outbound}
                  />
                ) : null}
              </div>
            </section>
          )}

          {showsTypeChoice ? (
            <section className="space-y-2 rounded-3xl border border-dashed bg-muted/15 p-4">
              <p className="text-sm font-semibold">Start inspection</p>
              <p className="text-sm text-muted-foreground">
                No inspection exists for this unit yet. Choose the flow you need.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button asChild className="w-full">
                  <Link to={startInboundTo}>Inbound</Link>
                </Button>
                <Button asChild className="w-full" variant="secondary">
                  <Link to={startOutboundTo}>Outbound</Link>
                </Button>
              </div>
            </section>
          ) : (
            <section className="space-y-2">
              {inbound === null ? (
                <Button asChild className="w-full sm:w-auto">
                  <Link to={startInboundTo}>Start inbound inspection</Link>
                </Button>
              ) : null}
              {outbound === null ? (
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <Link to={startOutboundTo}>Start outbound inspection</Link>
                </Button>
              ) : null}
              {inbound && outbound ? (
                <p className="text-sm text-muted-foreground">
                  Both inbound and outbound inspections already exist for this
                  unit. Open one above or use Search to find others.
                </p>
              ) : null}
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}

type ExistingInspectionRowProps = {
  label: string;
  inspection: InspectionWithChecklistPayload;
};

function ExistingInspectionRow({
  label,
  inspection,
}: ExistingInspectionRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">
          {formatWhen(inspection.created_at)} · {summarizeInspection(inspection)}
        </p>
        {inspection.warehouse_code ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Warehouse {inspection.warehouse_code}
            {inspection.plant_code ? ` · Plant ${inspection.plant_code}` : ""}
          </p>
        ) : null}
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link to={PAGES.opsInspectionDetailPath(inspection.uuid)}>
          View
        </Link>
      </Button>
    </div>
  );
}
