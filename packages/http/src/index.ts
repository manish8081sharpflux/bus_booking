import { randomUUID } from 'crypto';
export interface ErrorEnvelope { code: string; message: string; details: unknown; requestId: string; timestamp: string; }
export function requestId(value?: string): string { return value && /^[A-Za-z0-9._-]{8,128}$/.test(value) ? value : randomUUID(); }
export function errorEnvelope(code: string, message: string, requestIdValue: string, details: unknown = null): ErrorEnvelope { return { code, message, details, requestId: requestIdValue, timestamp: new Date().toISOString() }; }
