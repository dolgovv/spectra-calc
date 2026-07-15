import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { SpectraModule } from '../spectra/spectra.module';

@Module({
  imports: [SpectraModule],
  providers: [BotService],
})
export class BotModule {}
