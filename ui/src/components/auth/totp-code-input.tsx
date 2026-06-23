import type { ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeTotpCode } from "@/services/two-factor-api";
import { cn } from "@/lib/utils";

export type TotpCodeInputProps = {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function TotpCodeInput({
  id = "totp-code",
  label = "Authenticator code",
  value,
  onChange,
  disabled = false,
  className,
}: TotpCodeInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(normalizeTotpCode(event.target.value));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="123456"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="font-mono text-lg tracking-[0.35em]"
      />
      <p className="text-muted-foreground text-xs">
        Enter the 6-digit code from your authenticator app.
      </p>
    </div>
  );
}
