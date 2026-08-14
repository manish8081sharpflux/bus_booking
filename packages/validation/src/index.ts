export class ValidationError extends Error {
  readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export function assertString(
  value: unknown,
  name: string,
  options: { min?: number; max?: number; pattern?: RegExp } = {},
): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${name} is required.`, name);
  const result = value.trim();
  const min = options.min ?? 1;
  const max = options.max ?? 500;
  if (result.length < min || result.length > max) throw new ValidationError(`${name} must be between ${min} and ${max} characters.`, name);
  if (options.pattern && !options.pattern.test(result)) throw new ValidationError(`${name} has an invalid format.`, name);
  return result;
}

export function assertUuid(value: unknown, name: string): string {
  const result = assertString(value, name, { min: 36, max: 36 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new ValidationError(`${name} must be a valid UUID.`, name);
  }
  return result;
}

export function assertEmail(value: unknown, name = 'Email'): string {
  const result = assertString(value, name, { min: 3, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(result)) throw new ValidationError(`Enter a valid ${name.toLowerCase()}.`, name);
  return result;
}

export function assertIndianMobile(value: unknown, name = 'Mobile number'): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(digits)) throw new ValidationError(`${name} must be a valid 10-digit Indian mobile number.`, name);
  return digits;
}

export function assertEnum<T extends string>(value: unknown, name: string, allowed: readonly T[]): T {
  const result = assertString(value, name) as T;
  if (!allowed.includes(result)) throw new ValidationError(`${name} must be one of: ${allowed.join(', ')}.`, name);
  return result;
}

export function assertNumber(value: unknown, name: string, options: { min?: number; max?: number; integer?: boolean } = {}): number {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new ValidationError(`${name} must be a valid number.`, name);
  if (options.integer && !Number.isInteger(result)) throw new ValidationError(`${name} must be a whole number.`, name);
  if (options.min !== undefined && result < options.min) throw new ValidationError(`${name} must be at least ${options.min}.`, name);
  if (options.max !== undefined && result > options.max) throw new ValidationError(`${name} must not exceed ${options.max}.`, name);
  return result;
}

export function assertDate(value: unknown, name: string, options: { futureOnly?: boolean } = {}): string {
  const result = assertString(value, name, { min: 10, max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new ValidationError(`${name} must use YYYY-MM-DD format.`, name);
  const date = new Date(`${result}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${name} is invalid.`, name);
  if (options.futureOnly) {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (date.getTime() < today.getTime()) throw new ValidationError(`${name} cannot be in the past.`, name);
  }
  return result;
}
