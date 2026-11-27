import { Controller, Get } from '@nestjs/common';

/** For the container healthcheck. Left out of the request log, which it would otherwise flood. */
@Controller('api')
export class HealthController {
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
