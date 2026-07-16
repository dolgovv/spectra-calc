import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { SpectraModule } from '../spectra/spectra.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [SpectraModule, LoggingModule],
  providers: [BotService],
})
export class BotModule {}
