import { Module } from '@nestjs/common';
import { DashboardControllerResumo } from './controllers/dashboard.controller.summary';
import { DashboardServiceResumo } from './service/dashboard.service.summary';

@Module({
  controllers: [DashboardControllerResumo],
  providers: [DashboardServiceResumo],
})
export class DashboardModule {}
