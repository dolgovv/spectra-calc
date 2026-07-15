import { Module } from '@nestjs/common';
import { SpectraController } from './spectra.controller';
import { SpectraService } from './spectra.service';
import { CalcModule } from '../calc/calc.module';
import { RenderModule } from '../render/render.module';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [CalcModule, RenderModule, StorageModule, QueueModule],
  controllers: [SpectraController],
  providers: [SpectraService],
  exports: [SpectraService],
})
export class SpectraModule {}
