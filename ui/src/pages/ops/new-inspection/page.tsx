import { Barcode, ScanLine } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
import { OPS_BARCODE_LEN } from "@/pages/ops/new-inspection/constants";
import { clearAllInspectionDraftsForBarcode } from "@/pages/ops/new-inspection/inspection-draft-storage";

function getDefaultScannerEnabled() {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const smallViewport = window.matchMedia("(max-width: 768px)").matches;
  return coarsePointer || smallViewport;
}

export default function OpsNewInspectionPage() {
  const navigate = useNavigate();

  const [inspectionCode, setInspectionCode] = useState(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    return (params.get("barcode") ?? "")
      .replace(/\s+/g, "")
      .slice(0, OPS_BARCODE_LEN);
  });
  const [scannerEnabled, setScannerEnabled] = useState(() =>
    getDefaultScannerEnabled(),
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanErrorOpen, setScanErrorOpen] = useState(false);

  const isCodeValid = inspectionCode.trim().length === OPS_BARCODE_LEN;

  const goToUnit = useCallback(
    (barcode: string) => {
      const normalized = barcode.replace(/\s+/g, "").slice(0, OPS_BARCODE_LEN);
      if (normalized.length !== OPS_BARCODE_LEN) return;
      clearAllInspectionDraftsForBarcode(normalized);
      navigate(PAGES.opsNewInspectionUnitPath(normalized));
    },
    [navigate],
  );

  useEffect(() => {
    const normalized = inspectionCode.replace(/\s+/g, "").trim();
    if (normalized.length !== OPS_BARCODE_LEN) return;
    goToUnit(normalized);
  }, [inspectionCode, goToUnit]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("barcode") ?? "")
      .replace(/\s+/g, "")
      .slice(0, OPS_BARCODE_LEN);
    if (fromUrl.length === OPS_BARCODE_LEN) {
      clearAllInspectionDraftsForBarcode(fromUrl);
      navigate(PAGES.opsNewInspectionUnitPath(fromUrl), { replace: true });
    }
  }, [navigate]);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          New inspection
        </p>
        <p className="text-sm text-muted-foreground">
          Scan or enter the {OPS_BARCODE_LEN}-character barcode. You will
          confirm the product and choose inbound or outbound on the next screen.
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
                  const normalized = raw
                    .replace(/\s+/g, "")
                    .slice(0, OPS_BARCODE_LEN);
                  setInspectionCode(normalized);
                  if (normalized.length === OPS_BARCODE_LEN) {
                    setScannerEnabled(false);
                    goToUnit(normalized);
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
                Point the camera at the barcode. We use the first{" "}
                {OPS_BARCODE_LEN} characters.
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
                  event.target.value
                    .replace(/\s+/g, "")
                    .slice(0, OPS_BARCODE_LEN),
                )
              }
              placeholder={`Enter ${OPS_BARCODE_LEN} characters`}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            {inspectionCode.length}/{OPS_BARCODE_LEN} characters
          </p>
        </div>

        <Button
          type="button"
          className="w-full"
          disabled={!isCodeValid}
          onClick={() => goToUnit(inspectionCode.trim())}
        >
          Continue
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
            Check camera permissions and ensure no other app is using the
            camera. You can continue with manual code entry.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanErrorOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
