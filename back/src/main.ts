import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: true });
  const config = app.get(ConfigService<AppConfig, true>);

  app.enableCors({ origin: config.get('corsOrigins', { infer: true }) });
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
  );

  const port = config.get('port', { infer: true });
  await app.listen(port);
  Logger.log(`SpectraCalc backend: http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
