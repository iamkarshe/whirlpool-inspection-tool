import { useState } from "react";
import { Barcode, ScanLine } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CheckResult = "pass" | "fail" | "";

type WizardChecks = {
  outerSeal: CheckResult;
  outerLabel: CheckResult;
  innerSeal: CheckResult;
  innerCushion: CheckResult;
  productBody: CheckResult;
  productFunction: CheckResult;
};

const INITIAL_CHECKS: WizardChecks = {
  outerSeal: "",
  outerLabel: "",
  innerSeal: "",
  innerCushion: "",
  productBody: "",
  productFunction: "",
};

function getDefaultScannerEnabled() {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const smallViewport = window.matchMedia("(max-width: 768px)").matches;
  return coarsePointer || smallViewport;
}

export default function OpsNewInspectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCode = (searchParams.get("code") ?? "").replace(/\s+/g, "").slice(0, 15);
  const initialStep =
    searchParams.get("step") === "2" && initialCode.length === 15 ? 2 : 1;

  const [step, setStep] = useState<1 | 2>(initialStep as 1 | 2);
  const [inspectionCode, setInspectionCode] = useState(initialCode);
  const [checks, setChecks] = useState<WizardChecks>(INITIAL_CHECKS);
  const [scannerEnabled, setScannerEnabled] = useState(() =>
    getDefaultScannerEnabled(),
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanErrorOpen, setScanErrorOpen] = useState(false);

  const isCodeValid = inspectionCode.trim().length === 15;

  const updateCheck = (key: keyof WizardChecks, value: CheckResult) => {
    setChecks((prev) => ({ ...prev, [key]: value }));
  };

  const updateNewInspectionUrl = (next: {
    code: string;
    step: 1 | 2;
    source?: "scan" | "manual" | "submit";
    status?: "success";
  }) => {
    const params = new URLSearchParams();
    if (next.code) params.set("code", next.code);
    params.set("step", String(next.step));
    if (next.source) params.set("source", next.source);
    if (next.status) params.set("status", next.status);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Step {step} of 2
        </p>
        <p className="text-sm text-muted-foreground">
          {step === 1
            ? "Scan QR/barcode first. Manual entry is available as fallback."
            : "Complete the inspection checks before submitting."}
        </p>
      </header>

      {step === 1 && (
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
              {scannerEnabled ? "Stop Scan for Manual Entry" : "Scan"}
            </button>
          </div>

          {scannerEnabled ? (
            <div className="space-y-2 rounded-2xl border bg-background p-2">
              <Scanner
                onScan={(detectedCodes) => {
                  const raw = detectedCodes[0]?.rawValue ?? "";
                  if (!raw) return;
                  const normalized = raw.replace(/\s+/g, "").slice(0, 15);
                  setInspectionCode(normalized);
                  if (normalized.length === 15) {
                    setScannerEnabled(false);
                    setStep(2);
                    updateNewInspectionUrl({
                      code: normalized,
                      step: 2,
                      source: "scan",
                    });
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
              {scanError ? (
                <p className="text-xs text-destructive">{scanError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Point camera to QR code or barcode.
                </p>
              )}
            </div>
          ) : null}

          <div className="space-y-1 rounded-2xl border border-dashed bg-muted/20 p-3">
            <label
              htmlFor="manual-code"
              className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Manual entry (fallback)
            </label>
            <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2">
              <ScanLine className="h-4 w-4 text-muted-foreground" />
              <input
                id="manual-code"
                type="text"
                value={inspectionCode}
                onChange={(event) =>
                  setInspectionCode(
                    event.target.value.replace(/\s+/g, "").slice(0, 15),
                  )
                }
                placeholder="Enter 15 characters"
                className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {inspectionCode.length}/15 characters
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!isCodeValid}
            onClick={() => {
              setStep(2);
              updateNewInspectionUrl({
                code: inspectionCode.trim(),
                step: 2,
                source: "manual",
              });
            }}
          >
            Continue to checks
          </Button>
        </section>
      )}

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

      {step === 2 && (
        <section className="space-y-3">
          <div className="rounded-3xl border bg-card/80 p-4 shadow-sm">
            <p className="text-sm font-semibold">Outer Packaging</p>
            <div className="mt-3 space-y-2">
              <CheckRow
                label="Outer seal condition"
                value={checks.outerSeal}
                onChange={(value) => updateCheck("outerSeal", value)}
              />
              <CheckRow
                label="Outer label readability"
                value={checks.outerLabel}
                onChange={(value) => updateCheck("outerLabel", value)}
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-card/80 p-4 shadow-sm">
            <p className="text-sm font-semibold">Inner Packing</p>
            <div className="mt-3 space-y-2">
              <CheckRow
                label="Inner seal integrity"
                value={checks.innerSeal}
                onChange={(value) => updateCheck("innerSeal", value)}
              />
              <CheckRow
                label="Inner cushion fit"
                value={checks.innerCushion}
                onChange={(value) => updateCheck("innerCushion", value)}
              />
            </div>
          </div>

          <div className="rounded-3xl border bg-card/80 p-4 shadow-sm">
            <p className="text-sm font-semibold">Product</p>
            <div className="mt-3 space-y-2">
              <CheckRow
                label="Body visual quality"
                value={checks.productBody}
                onChange={(value) => updateCheck("productBody", value)}
              />
              <CheckRow
                label="Basic function check"
                value={checks.productFunction}
                onChange={(value) => updateCheck("productFunction", value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep(1);
                updateNewInspectionUrl({
                  code: inspectionCode.trim(),
                  step: 1,
                  source: "manual",
                });
              }}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => {
                updateNewInspectionUrl({
                  code: inspectionCode.trim(),
                  step: 1,
                  source: "submit",
                  status: "success",
                });
                setChecks(INITIAL_CHECKS);
                setStep(1);
              }}
            >
              Submit inspection
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

type CheckRowProps = {
  label: string;
  value: CheckResult;
  onChange: (value: CheckResult) => void;
};

function CheckRow({ label, value, onChange }: CheckRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-3 py-2">
      <p className="text-sm">{label}</p>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CheckResult)}
        className="h-8 rounded-md border bg-background px-2 text-xs outline-none"
      >
        <option value="">Select</option>
        <option value="pass">Pass</option>
        <option value="fail">Fail</option>
      </select>
    </div>
  );
}
