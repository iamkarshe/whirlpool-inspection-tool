import { AlertCircle, Lightbulb } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  evaluatePasswordStrength,
  PASSWORD_SCORE_LABELS,
  PASSWORD_STRENGTH_MIN_SCORE,
} from "@/lib/password-strength";

const SEGMENT_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
] as const;

const LABEL_COLORS = [
  "text-red-600 dark:text-red-400",
  "text-orange-600 dark:text-orange-400",
  "text-amber-600 dark:text-amber-400",
  "text-lime-700 dark:text-lime-400",
  "text-emerald-700 dark:text-emerald-400",
] as const;

export type PasswordStrengthMeterProps = {
  password: string;
  userInputs?: string[];
  confirmPassword?: string;
  showConfirmMismatch?: boolean;
  debounceMs?: number;
  onValidityChange?: (valid: boolean) => void;
  className?: string;
};

export function PasswordStrengthMeter({
  password,
  userInputs = [],
  confirmPassword,
  showConfirmMismatch = true,
  debounceMs = 200,
  onValidityChange,
  className,
}: PasswordStrengthMeterProps) {
  const [debouncedPassword, setDebouncedPassword] = useState(password);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedPassword(password);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [password, debounceMs]);

  const strength = useMemo(
    () => evaluatePasswordStrength(debouncedPassword, userInputs),
    [debouncedPassword, userInputs],
  );

  const confirmMismatch =
    showConfirmMismatch &&
    confirmPassword !== undefined &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  const isValid =
    strength.meetsMinimum &&
    debouncedPassword.length > 0 &&
    (!confirmPassword || password === confirmPassword);

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  if (!password) return null;

  const activeColor =
    SEGMENT_COLORS[strength.score] ?? SEGMENT_COLORS[0];
  const labelColor = LABEL_COLORS[strength.score] ?? LABEL_COLORS[0];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn("font-medium", labelColor)}>
            {PASSWORD_SCORE_LABELS[strength.score]}
          </span>
        </div>
        <div className="flex gap-1">
          {SEGMENT_COLORS.map((segmentColor, index) => (
            <div
              key={segmentColor}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index <= strength.score ? activeColor : "bg-muted",
              )}
            />
          ))}
        </div>
        {strength.crackTimeDisplay ? (
          <p className="text-muted-foreground text-xs">
            Estimated time to crack: {strength.crackTimeDisplay}
          </p>
        ) : null}
      </div>

      {!strength.meetsMinimum && debouncedPassword.length > 0 ? (
        <p className="text-destructive text-xs">
          Use a stronger password (score {PASSWORD_STRENGTH_MIN_SCORE} or
          higher required).
        </p>
      ) : null}

      {confirmMismatch ? (
        <p className="text-destructive text-xs">
          Password and confirm password do not match.
        </p>
      ) : null}

      {strength.warning ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Password warning</AlertTitle>
          <AlertDescription>{strength.warning}</AlertDescription>
        </Alert>
      ) : null}

      {strength.suggestions.length > 0 ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium">
            <Lightbulb className="text-muted-foreground h-3.5 w-3.5" />
            Suggestions
          </div>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-xs">
            {strength.suggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
