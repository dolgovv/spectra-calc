import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { Request, Response } from 'express';
import { AdminAuthService, SESSION_COOKIE, SESSION_COOKIE_PATH, SESSION_TTL_MS } from './admin-auth.service';
import { ADMIN_DISABLED_MESSAGE, AdminGuard } from './admin.guard';
import {
  CalculationsQueryDto,
  LoginDto,
  RequestSummaryQueryDto,
  RequestsQueryDto,
  WindowQueryDto,
} from './dto/admin-query.dto';
import { CalculationLogService, type CalculationDetail } from '../analytics/calculation-log.service';
import { DatabaseService } from '../analytics/database.service';
import { RequestLogService } from '../analytics/request-log.service';
import { VisitsService } from '../analytics/visits.service';
import { clientIp } from '../analytics/client-info';
import { DAY_MS, dayWindow } from '../analytics/days';
import { RenderService } from '../render/render.service';
import { matrixToCsv } from '../render/csv/matrixToCsv';
import type { AppConfig } from '../config/configuration';
import type { CalculationResult } from '../common/types/spectra.types';

const ARTIFACT_NAMES = ['heatmap.png', 'report.pdf', 'matrix.csv', 'result.json'] as const;
type ArtifactName = (typeof ARTIFACT_NAMES)[number];

const uuid = new ParseUUIDPipe({ version: '4' });

async function fileSize(path: string): Promise<number> {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

@Controller('api/admin')
export class AdminController {
  private readonly archiveTtlMs: number;
  private readonly logRetentionMs: number;

  constructor(
    private readonly auth: AdminAuthService,
    private readonly calculations: CalculationLogService,
    private readonly requests: RequestLogService,
    private readonly visits: VisitsService,
    private readonly database: DatabaseService,
    private readonly render: RenderService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.archiveTtlMs = config.get('archiveTtlMs', { infer: true });
    this.logRetentionMs = config.get('logRetentionMs', { infer: true });
  }

  @Post('login')
  @HttpCode(204)
  login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): void {
    if (!this.auth.enabled) throw new NotFoundException(ADMIN_DISABLED_MESSAGE);
    if (!this.auth.checkPassword(body.password, clientIp(req))) {
      throw new UnauthorizedException('Неверный пароль');
    }
    res.cookie(SESSION_COOKIE, this.auth.issueSession(), {
      httpOnly: true,
      sameSite: 'strict',
      // The host's nginx terminates TLS and says so; locally it is plain http.
      secure: req.headers['x-forwarded-proto'] === 'https',
      path: SESSION_COOKIE_PATH,
      maxAge: SESSION_TTL_MS,
    });
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: SESSION_COOKIE_PATH });
  }

  @Get('session')
  @UseGuards(AdminGuard)
  session(): { authenticated: true } {
    return { authenticated: true };
  }

  @Get('overview')
  @UseGuards(AdminGuard)
  async overview(@Query() query: WindowQueryDto) {
    const window = dayWindow(query.days, query.tz);
    const visits = this.visits.overview(window);
    const calculations = this.calculations.overview(window);
    const archives = await this.calculations.archiveUsage();
    const databaseBytes =
      (await fileSize(this.database.path)) + (await fileSize(`${this.database.path}-wal`));

    return {
      days: query.days,
      visits: { today: visits.today, week: visits.week, range: visits.range },
      calculations: {
        today: calculations.today,
        week: calculations.week,
        range: calculations.range,
      },
      daily: window.days.map((date) => {
        const v = visits.daily.get(date);
        const c = calculations.daily.get(date);
        return {
          date,
          views: v?.views ?? 0,
          visitors: v?.visitors ?? 0,
          calcOk: c?.ok ?? 0,
          calcError: c?.error ?? 0,
        };
      }),
      topPaths: visits.topPaths,
      topReferrers: visits.topReferrers,
      storage: { archives: archives.count, archiveBytes: archives.bytes, databaseBytes },
      retention: {
        archiveDays: this.archiveTtlMs / DAY_MS,
        logDays: this.logRetentionMs / DAY_MS,
      },
    };
  }

  @Get('requests')
  @UseGuards(AdminGuard)
  requestLog(@Query() { admin, ...query }: RequestsQueryDto) {
    return this.requests.list({ ...query, includeAdmin: admin === '1' });
  }

  @Get('requests/summary')
  @UseGuards(AdminGuard)
  requestSummary(@Query() query: RequestSummaryQueryDto) {
    return this.requests.summary(dayWindow(query.days, query.tz).sinceTs, query.admin === '1');
  }

  @Get('calculations')
  @UseGuards(AdminGuard)
  calculationList(@Query() query: CalculationsQueryDto) {
    return this.calculations.list(query);
  }

  @Get('calculations/:id')
  @UseGuards(AdminGuard)
  calculation(@Param('id', uuid) id: string): CalculationDetail {
    return this.findCalculation(id);
  }

  @Get('calculations/:id/archive')
  @UseGuards(AdminGuard)
  archive(
    @Param('id', uuid) id: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    const calculation = this.findCalculation(id);
    const path = this.calculations.archivePath(id);
    if (!existsSync(path)) {
      throw new NotFoundException('Архив удалён по сроку хранения');
    }
    res.attachment(calculation.fileName);
    return new StreamableFile(createReadStream(path));
  }

  /**
   * The artifacts of a past calculation, rendered again from its stored result. The public copies
   * under /files expire after STORAGE_TTL_HOURS; the result does not, and rendering is
   * deterministic, so the admin can still download them for any calculation that succeeded.
   */
  @Get('calculations/:id/files/:name')
  @UseGuards(AdminGuard)
  async artifact(
    @Param('id', uuid) id: string,
    @Param('name') name: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!ARTIFACT_NAMES.includes(name as ArtifactName)) throw new NotFoundException();
    const { result, fileName } = this.findCalculation(id);
    if (!result) throw new NotFoundException('У неуспешного расчёта нет результата');

    res.attachment(`${fileName.replace(/\.zip$/i, '')}_${name}`);
    return new StreamableFile(await this.renderArtifact(result, name as ArtifactName));
  }

  private async renderArtifact(result: CalculationResult, name: ArtifactName): Promise<Buffer> {
    switch (name) {
      case 'heatmap.png':
        return this.render.renderHeatmap(result);
      case 'report.pdf':
        return (await this.render.render(result)).reportPdf;
      case 'matrix.csv':
        return Buffer.from(matrixToCsv(result.matrix, result.xTicks, result.yTicks));
      case 'result.json':
        return Buffer.from(JSON.stringify(result, null, 2));
    }
  }

  private findCalculation(id: string): CalculationDetail {
    const calculation = this.calculations.get(id);
    if (!calculation) throw new NotFoundException('Расчёт не найден');
    return calculation;
  }
}
