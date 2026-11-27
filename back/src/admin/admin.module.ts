import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';
import { AnalyticsModule } from '../analytics/analytics.module';
import { RenderModule } from '../render/render.module';

@Module({
  imports: [AnalyticsModule, RenderModule],
  controllers: [AdminController],
  providers: [AdminAuthService, AdminGuard],
})
export class AdminModule {}
