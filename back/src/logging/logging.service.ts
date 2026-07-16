import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "../config/configuration";

/** Fields shared by every request log line. `date` is the leading ISO timestamp of the line. */
export interface RequestLogEntry {
  chatId: number | string;
  fileName: string;
  fileSize: number;
  /** Requested interval, e.g. "590-625"; null when it could not be parsed. */
  interval: string | null;
  date: string;
  /** Calculation time in seconds; 0 when the request failed before/at computation. */
  calcTime: number;
}

export interface ErrorLogEntry extends RequestLogEntry {
  errorDescription: string;
}

/**
 * Appends one line per request to plain-text logs under LOGS_ROOT:
 *   - success.log - every successfully processed request
 *   - errors.log  - every failed request (adds error_description)
 * Logging is best-effort: an I/O failure here is caught and reported to the Nest logger, never
 * propagated to the request flow.
 */
@Injectable()
export class LoggingService implements OnModuleInit {
  private readonly logger = new Logger(LoggingService.name);
  private readonly logsRoot: string;
  private readonly successLogPath: string;
  private readonly errorsLogPath: string;

  constructor(config: ConfigService<AppConfig, true>) {
    this.logsRoot = config.get("logsRoot", { infer: true });
    this.successLogPath = join(this.logsRoot, "success.log");
    this.errorsLogPath = join(this.logsRoot, "errors.log");
  }

  async onModuleInit(): Promise<void> {
    await mkdir(this.logsRoot, { recursive: true }).catch((err) =>
      this.logger.error(
        `Не удалось создать каталог логов: ${(err as Error).message}`,
      ),
    );
  }

  async logSuccess(entry: RequestLogEntry): Promise<void> {
    await this.append(this.successLogPath, this.formatCommon(entry));
  }

  async logError(entry: ErrorLogEntry): Promise<void> {
    const line = `${this.formatCommon(entry)} | error_description=${quote(entry.errorDescription)}`;
    await this.append(this.errorsLogPath, line);
  }

  private formatCommon(entry: RequestLogEntry): string {
    return (
      `${entry.date} | ` +
      `chat_id=${entry.chatId} | ` +
      `file_name=${quote(entry.fileName)} | ` +
      `file_size=${entry.fileSize} | ` +
      `interval=${entry.interval ?? "-"} | ` +
      `calc_time=${entry.calcTime}s`
    );
  }

  private async append(path: string, line: string): Promise<void> {
    try {
      await appendFile(path, `${line}\n`, "utf-8");
    } catch (err) {
      this.logger.error(
        `Не удалось записать лог (${path}): ${(err as Error).message}`,
      );
    }
  }
}

/** Wraps a value in double quotes and escapes embedded quotes/newlines so each entry stays one line. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
}
