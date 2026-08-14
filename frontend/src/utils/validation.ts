export type ValidationResult = { valid: true } | { valid: false; message: string };

const ok = (): ValidationResult => ({ valid: true });
const fail = (message: string): ValidationResult => ({ valid: false, message });

export const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();
export const digitsOnly = (value: string, max = 15) => value.replace(/\D/g, '').slice(0, max);
export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeCode = (value: string, max = 40) => value.toUpperCase().replace(/[^A-Z0-9/_-]/g, '').slice(0, max);

export function validatePersonName(value: string, label = 'Name'): ValidationResult {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return fail(`${label} is required.`);
  if (normalized.length < 2 || normalized.length > 80) return fail(`${label} must be between 2 and 80 characters.`);
  if (!/^[\p{L}\p{M} .'-]+$/u.test(normalized)) return fail(`${label} may contain letters, spaces, dots, apostrophes and hyphens only.`);
  return ok();
}

export function validateEmail(value: string, required = false): ValidationResult {
  const email = normalizeEmail(value);
  if (!email) return required ? fail('Email address is required.') : ok();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) return fail('Enter a valid email address.');
  return ok();
}

export function validateIndianMobile(value: string, label = 'Mobile number'): ValidationResult {
  const mobile = digitsOnly(value, 10);
  if (!/^[6-9]\d{9}$/.test(mobile)) return fail(`${label} must be a valid 10-digit Indian mobile number.`);
  return ok();
}

export function validateInternationalMobile(value: string, label = 'Mobile number'): ValidationResult {
  const normalized = value.replace(/[\s-]/g, '');
  if (!/^\+?[1-9]\d{9,14}$/.test(normalized)) return fail(`Enter a valid ${label.toLowerCase()}, including country code when required.`);
  return ok();
}

export function validateOtp(value: string, digits = 6): ValidationResult {
  const otp = value.replace(/\D/g, '');
  if (otp.length !== digits) return fail(`Enter the ${digits}-digit OTP.`);
  return ok();
}

export function validatePassword(value: string): ValidationResult {
  if (value.length < 8 || value.length > 72) return fail('Password must be between 8 and 72 characters.');
  if (/\s/.test(value)) return fail('Password cannot contain spaces.');
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return fail('Password must include uppercase, lowercase, a number and a special character.');
  }
  return ok();
}

export function validatePositiveNumber(value: string | number, label: string, min = 0.01, max = Number.MAX_SAFE_INTEGER): ValidationResult {
  const number = Number(value);
  if (!Number.isFinite(number)) return fail(`${label} must be a valid number.`);
  if (number < min || number > max) return fail(`${label} must be between ${min} and ${max}.`);
  return ok();
}

export function validateInteger(value: string | number, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): ValidationResult {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return fail(`${label} must be a whole number between ${min} and ${max}.`);
  return ok();
}

export function validateFutureDate(value: string, label = 'Date', allowToday = true): ValidationResult {
  if (!value) return fail(`${label} is required.`);
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fail(`Enter a valid ${label.toLowerCase()}.`);
  const now = new Date(); now.setHours(0,0,0,0);
  if (date.getTime() < now.getTime() || (!allowToday && date.getTime() === now.getTime())) return fail(`${label} cannot be in the past.`);
  return ok();
}

export function validateFile(file: File | null | undefined, options: { label?: string; required?: boolean; maxMb?: number; types?: string[] } = {}): ValidationResult {
  const { label = 'File', required = false, maxMb = 10, types = [] } = options;
  if (!file) return required ? fail(`${label} is required.`) : ok();
  if (file.size > maxMb * 1024 * 1024) return fail(`${label} must be smaller than ${maxMb} MB.`);
  if (types.length && !types.includes(file.type)) return fail(`${label} has an unsupported file type.`);
  return ok();
}

export function validateLicenseNumber(value: string, required = false): ValidationResult {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return required ? fail('Driving licence number is required.') : ok();
  if (normalized.length < 5 || normalized.length > 24 || !/^[A-Z0-9/-]+$/.test(normalized)) return fail('Enter a valid driving licence number.');
  return ok();
}

export function validateUrlToken(value: string): ValidationResult {
  if (!value || value.length < 20 || value.length > 512 || !/^[A-Za-z0-9._~-]+$/.test(value)) return fail('This checkout link is invalid or incomplete.');
  return ok();
}

export function firstError(results: ValidationResult[]): string {
  return results.find((result): result is { valid: false; message: string } => !result.valid)?.message || '';
}
