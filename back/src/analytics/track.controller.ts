import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { VisitsService } from './visits.service';
import { clientIp, isBot, referrerHost, userAgent, visitorId } from './client-info';
import type { AppConfig } from '../config/configuration';

/** Sent by the SPA with navigator.sendBeacon as a urlencoded form, which needs no CORS preflight. */
export class TrackDto {
  @IsString()
  @MaxLength(200)
  @Matches(/^\//)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  referrer?: string;
}

@Controller('api')
export class TrackController {
  /** Requests reach the back with Host: back:3000, so our own host comes from the config. */
  private readonly ownHost: string | undefined;

  constructor(
    private readonly visits: VisitsService,
    config: ConfigService<AppConfig, true>,
  ) {
    try {
      this.ownHost = new URL(config.get('publicBaseUrl', { infer: true })).host;
    } catch {
      this.ownHost = undefined;
    }
  }

  /** Always 204: the beacon cannot read the answer, and a crawler learns nothing from it. */
  @Post('track')
  @HttpCode(204)
  track(@Body() body: TrackDto, @Req() req: Request): void {
    const ua = userAgent(req);
    if (isBot(ua) || body.path.startsWith('/admin')) return;

    this.visits.record({
      ts: Date.now(),
      path: body.path.split('?')[0],
      referrer: referrerHost(body.referrer, this.ownHost),
      visitor: visitorId(clientIp(req), ua),
    });
  }
}
