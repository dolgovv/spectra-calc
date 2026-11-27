import { Module } from '@nestjs/common';
import { SpectraController } from './spectra.controller';
import { SpectraService } from './spectra.service';
import { CalcModule } from '../calc/calc.module';
import { RenderModule } from '../render/render.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [CalcModule, RenderModule, StorageModule, QueueModule, AnalyticsModule],
  controllers: [SpectraController],
  providers: [SpectraService],
})
export class SpectraModule {}
