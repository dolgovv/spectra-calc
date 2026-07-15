import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { loadConfig } from './config/configuration';
import { SpectraModule } from './spectra/spectra.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [loadConfig], cache: true }),
    // Serve persisted artifacts (heatmap.png, report.pdf, …) under /files/<jobId>/<name>.
    ServeStaticModule.forRoot({
      rootPath: loadConfig().storageRoot,
      serveRoot: '/files',
      serveStaticOptions: { index: false, fallthrough: true },
    }),
    SpectraModule,
    BotModule,
  ],
})
export class AppModule {}
