import { resolve } from 'node:path';

export interface AppConfig {
  port: number;
  publicBaseUrl: string;
  corsOrigins: string[];
  storageRoot: string;
  queueMax: number;
  botToken: string | null;
  botProxyUrl: string | null;
}

export function loadConfig(): AppConfig {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  return {
    port,
    publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
    corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    storageRoot: resolve(process.cwd(), process.env.STORAGE_ROOT ?? './storage'),
    queueMax: Number.parseInt(process.env.QUEUE_MAX ?? '25', 10),
    botToken: process.env.BOT_TOKEN?.trim() ? process.env.BOT_TOKEN.trim() : null,
    botProxyUrl: process.env.BOT_PROXY_URL?.trim() ? process.env.BOT_PROXY_URL.trim() : null,
  };
}
