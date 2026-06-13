import zxcvbn from "zxcvbn";

/** Mirrors server `PASSWORD_STRENGTH_MIN_SCORE`. */
export const PASSWORD_STRENGTH_MIN_SCORE = 3;

export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_SCORE_LABELS = [
  "Very weak",
  "Weak",
  "Fair",
  "Strong",
  "Very strong",
] as const;

export type PasswordStrengthResult = {
  score: number;
  label: (typeof PASSWORD_SCORE_LABELS)[number];
  warning: string | null;
  suggestions: string[];
  crackTimeDisplay: string;
  meetsMinimum: boolean;
};

export function evaluatePasswordStrength(
  password: string,
  userInputs: string[] = [],
): PasswordStrengthResult {
  const dictionaryInputs = userInputs
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (!password) {
    return {
      score: 0,
      label: PASSWORD_SCORE_LABELS[0],
      warning: null,
      suggestions: [],
      crackTimeDisplay: "",
      meetsMinimum: false,
    };
  }

  const result = zxcvbn(password, dictionaryInputs);
  const score = result.score;

  return {
    score,
    label: PASSWORD_SCORE_LABELS[score] ?? PASSWORD_SCORE_LABELS[0],
    warning: result.feedback.warning ?? null,
    suggestions: result.feedback.suggestions,
    crackTimeDisplay: String(
      result.crack_times_display.offline_slow_hashing_1e4_per_second,
    ),
    meetsMinimum: score >= PASSWORD_STRENGTH_MIN_SCORE,
  };
}

export function passwordsMatch(
  password: string,
  confirmPassword: string,
): boolean {
  return password.length > 0 && password === confirmPassword;
}

export function isPasswordFormValid(
  newPassword: string,
  confirmPassword: string,
  userInputs: string[] = [],
): boolean {
  if (newPassword.length < PASSWORD_MIN_LENGTH) return false;
  if (newPassword.length > PASSWORD_MAX_LENGTH) return false;
  if (!passwordsMatch(newPassword, confirmPassword)) return false;
  return evaluatePasswordStrength(newPassword, userInputs).meetsMinimum;
}
