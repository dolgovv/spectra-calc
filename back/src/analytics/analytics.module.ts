import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { RequestLogService } from './request-log.service';
import { RequestLogMiddleware } from './request-log.middleware';
import { VisitsService } from './visits.service';
import { CalculationLogService } from './calculation-log.service';
import { RetentionService } from './retention.service';
import { TrackController } from './track.controller';

/** Records what the admin panel shows: requests, page views and calculations. */
@Module({
  controllers: [TrackController],
  providers: [
    DatabaseService,
    RequestLogService,
    VisitsService,
    CalculationLogService,
    RetentionService,
  ],
  exports: [DatabaseService, RequestLogService, VisitsService, CalculationLogService],
})
export class AnalyticsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Registered before ServeStaticModule mounts /files (that happens in its onModuleInit), so
    // artifact downloads are logged too.
    consumer.apply(RequestLogMiddleware).forRoutes('*');
  }
}
