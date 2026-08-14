export type LogFields = Record<string, unknown>;
export function log(service: string, level: 'info' | 'warn' | 'error', message: string, fields: LogFields = {}): void { console.log(JSON.stringify({ timestamp: new Date().toISOString(), service, level, message, ...fields })); }
