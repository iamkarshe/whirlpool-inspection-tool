const REGISTRATION_SPACE_DASH = /[\s\-_]+/g;

// Bharat (BH) series, e.g. `21BH1234AA`
const BHARAT_REGISTRATION_PATTERN = /^\d{2}BH\d{4}[A-Z]{2}$/;

// State / old series, e.g. `CG01AC23334`
const STATE_REGISTRATION_PATTERN = /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{3,5}$/;

export function normalizeIndianVehicleRegistration(raw: string): string {
  return (raw ?? "").toUpperCase().replace(REGISTRATION_SPACE_DASH, "");
}

export function isValidIndianVehicleRegistration(raw: string): boolean {
  const n = normalizeIndianVehicleRegistration(raw);
  if (n.length < 8 || n.length > 13) return false;
  return (
    BHARAT_REGISTRATION_PATTERN.test(n) || STATE_REGISTRATION_PATTERN.test(n)
  );
}
