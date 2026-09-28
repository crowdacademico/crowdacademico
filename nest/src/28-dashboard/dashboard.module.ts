import { Module } from '@nestjs/common';
import { DashboardControllerSummary } from './controllers/dashboard.controller.summary';
import { DashboardServiceSummary } from './service/dashboard.service.summary';

@Module({
  controllers: [DashboardControllerSummary],
  providers: [DashboardServiceSummary],
})
export class DashboardModule {}
