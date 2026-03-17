import { useState } from "react";
import { Barcode, QrCode, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";

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

export default function OpsNewInspectionPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [inspectionCode, setInspectionCode] = useState("");
  const [checks, setChecks] = useState<WizardChecks>(INITIAL_CHECKS);

  const isCodeValid = inspectionCode.trim().length === 15;

  const updateCheck = (key: keyof WizardChecks, value: CheckResult) => {
    setChecks((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Step {step} of 2
        </p>
        <p className="text-sm text-muted-foreground">
          {step === 1
            ? "Scan QR/barcode or manually enter the 15-character code."
            : "Complete the inspection checks before submitting."}
        </p>
      </header>

      {step === 1 && (
        <section className="space-y-3 rounded-3xl border bg-card/80 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl border bg-muted/40 px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
            >
              <QrCode className="h-5 w-5 text-muted-foreground" />
              Scan QR
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl border bg-muted/40 px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
            >
              <Barcode className="h-5 w-5 text-muted-foreground" />
              Scan Barcode
            </button>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="manual-code"
              className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
            >
              Manual code input
            </label>
            <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2">
              <ScanLine className="h-4 w-4 text-muted-foreground" />
              <input
                id="manual-code"
                type="text"
                value={inspectionCode}
                onChange={(event) =>
                  setInspectionCode(event.target.value.replace(/\s+/g, "").slice(0, 15))
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
            onClick={() => setStep(2)}
          >
            Continue to checks
          </Button>
        </section>
      )}

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
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="button">Submit inspection</Button>
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

