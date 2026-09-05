import { Module } from '@nestjs/common';
import { DashboardControllerResumo } from './controllers/dashboard.controller.resumo';
import { DashboardServiceResumo } from './service/dashboard.service.resumo';

@Module({
  controllers: [DashboardControllerResumo],
  providers: [DashboardServiceResumo],
})
export class DashboardModule {}
