export type Environment = 'development' | 'test' | 'staging' | 'production';
export function requiredEnv(name: string, value = process.env[name]): string { if (!value) throw new Error(`Missing required environment variable: ${name}`); return value; }
export function environment(value = process.env.NODE_ENV): Environment { const candidate = value || 'development'; if (!['development','test','staging','production'].includes(candidate)) throw new Error('NODE_ENV is invalid'); return candidate as Environment; }
export function rejectUnsafeProductionDefault(name: string, value: string, defaults: string[]): void { if (environment() === 'production' && defaults.includes(value)) throw new Error(`${name} uses an unsafe production default`); }
