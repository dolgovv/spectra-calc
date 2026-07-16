import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Bot, Context, InputFile } from "grammy";
import { ProxyAgent } from "undici";
import { SpectraService } from "../spectra/spectra.service";
import { LoggingService } from "../logging/logging.service";
import {
  createGrammyProxyAgent,
  createUndiciProxyDispatcher,
  fetchBuffer,
} from "./proxy";
import type { AppConfig } from "../config/configuration";
import type {
  CalculationResult,
  SpectrumInterval,
} from "../common/types/spectra.types";

/**
 * Telegram bot: a user sends a .zip document with a caption of the interval ("590-625" or
 * "/calc 590 625"); the bot runs the same calculation pipeline and replies with the heatmap
 * PNG, the PDF report and a text summary. Telegram traffic is routed through the configured
 * proxy since this environment cannot reach api.telegram.org directly.
 */
@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot | null = null;
  private downloadDispatcher?: ProxyAgent;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly spectra: SpectraService,
    private readonly requestLog: LoggingService,
  ) {}

  onModuleInit(): void {
    const token = this.config.get("botToken", { infer: true });
    if (!token) {
      this.logger.log("BOT_TOKEN не задан - Telegram-бот отключён");
      return;
    }

    const proxyUrl = this.config.get("botProxyUrl", { infer: true });
    const clientOptions = proxyUrl
      ? { baseFetchConfig: { agent: createGrammyProxyAgent(proxyUrl) } }
      : {};
    if (proxyUrl)
      this.downloadDispatcher = createUndiciProxyDispatcher(proxyUrl);

    this.bot = new Bot(token, { client: clientOptions });
    this.registerHandlers(this.bot);
    this.bot.catch((err) => this.logger.error(`Ошибка бота: ${err.message}`));
    // start() resolves only when the bot stops; fire-and-forget so Nest bootstrap continues.
    void this.bot
      .start({
        onStart: (me) =>
          this.logger.log(`Telegram-бот запущен: @${me.username}`),
      })
      .catch((err) =>
        this.logger.error(
          `Не удалось запустить бота: ${(err as Error).message}`,
        ),
      );
  }

  async onModuleDestroy(): Promise<void> {
    await this.bot?.stop();
  }

  private registerHandlers(bot: Bot): void {
    bot.command("start", (ctx) =>
      ctx.reply(
        "SpectraCalc-бот. Пришлите .zip архив со 100 спектрами и укажите интервал в подписи - " +
          "в любом формате: «590-625», «590 625», «590/625» или «интервал 590 до 625».",
      ),
    );

    bot.command("help", (ctx) =>
      ctx.reply(
        "Отправьте .zip с подписью-интервалом (любой формат: «590-625», «590 625», " +
          "«интервал 590 до 625») - верну карту, PDF и сводку.",
      ),
    );

    bot.on("message:document", (ctx) => this.handleDocument(ctx));
  }

  private async handleDocument(ctx: Context): Promise<void> {
    const doc = ctx.message?.document;
    if (!doc) return;
    const name = doc.file_name ?? "archive.zip";

    if (!/\.zip$/i.test(name)) {
      await ctx.reply("Нужен .zip архив со спектрами.");
      return;
    }

    const interval = parseInterval(ctx.message?.caption);
    if (!interval) {
      await ctx.reply(
        "Не нашёл интервал в подписи. Укажите два числа, например «590-625» или «590 625».",
      );
      return;
    }

    const chatId = ctx.chat?.id ?? ctx.from?.id ?? "unknown";
    const intervalLabel = `${interval.from}-${interval.to}`;

    await ctx.reply(
      `Считаю карту для интервала ${interval.from}–${interval.to} см⁻¹…`,
    );
    try {
      const buffer = await this.downloadDocument(ctx, doc.file_id);
      const { result, artifacts } = await this.spectra.calculateWithArtifacts({
        buffer,
        interval,
        sourceFileName: name,
      });

      await ctx.replyWithPhoto(
        new InputFile(artifacts.heatmapPng, "heatmap.png"),
        {
          caption: botCaption(result),
        },
      );
      await ctx.replyWithDocument(
        new InputFile(artifacts.reportPdf, "report.pdf"),
      );

      await this.requestLog.logSuccess({
        chatId,
        fileName: name,
        fileSize: doc.file_size ?? buffer.length,
        interval: intervalLabel,
        date: result.computedAt,
        calcTime: result.stats.calcTimeSeconds,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ошибка расчёта";
      await ctx.reply(`Не удалось обработать архив: ${message}`);

      await this.requestLog.logError({
        chatId,
        fileName: name,
        fileSize: doc.file_size ?? 0,
        interval: intervalLabel,
        date: new Date().toISOString(),
        calcTime: 0,
        errorDescription: message,
      });
    }
  }

  private async downloadDocument(
    ctx: Context,
    fileId: string,
  ): Promise<Buffer> {
    const file = await ctx.api.getFile(fileId);
    const token = this.config.get("botToken", { infer: true });
    const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    return fetchBuffer(url, this.downloadDispatcher);
  }
}

function botCaption(result: CalculationResult): string {
  const s = result.stats;
  return (
    `Интервал ${result.interval.from}–${result.interval.to} см⁻¹\n` +
    `μ = ${Math.round(s.meanIntensity)} · σ = ${Math.round(s.stdDeviation)}\n` +
    `Sr = ${s.relStdDeviationPercent.toFixed(1)} % - ${s.categoryLabel}`
  );
}

/**
 * Interprets ANY caption as an interval: everything that is not a number (letters, "/calc",
 * dashes, slashes, units, punctuation) acts as a separator, and the first two numbers found
 * become the interval, in any order. So "590-625", "590 625", "590/625", "интервал 590 до 625"
 * and "590-625 см⁻¹" all yield { from: 590, to: 625 }. The leading `-` is treated as a separator,
 * not a sign, so the common "590-625" form parses correctly.
 */
function parseInterval(caption?: string): SpectrumInterval | null {
  if (!caption) return null;
  const nums = caption.match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const a = Number.parseFloat(nums[0]);
  const b = Number.parseFloat(nums[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
  return { from: Math.min(a, b), to: Math.max(a, b) };
}
