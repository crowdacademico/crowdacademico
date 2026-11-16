import { Module } from '@nestjs/common';
import { EmailModule } from '../4-mail/email.module';
import { PagamentoModule } from '../23-pagamento/pagamento.module';
import { DashboardControllerHealth } from './controllers/dashboard.controller.health';
import { DashboardControllerSeries } from './controllers/dashboard.controller.series';
import { DashboardServiceHealth } from './service/dashboard.service.health';
import { DashboardServiceSeries } from './service/dashboard.service.series';
import { DashboardControllerSummary } from './controllers/dashboard.controller.summary';
import { DashboardServiceSummary } from './service/dashboard.service.summary';

@Module({
  // A aba Saúde fala com o provedor de pagamento e o de e-mail (as portas, nunca os adapters).
  imports: [PagamentoModule, EmailModule],
  controllers: [
    DashboardControllerSummary,
    DashboardControllerHealth,
    DashboardControllerSeries,
  ],
  providers: [
    DashboardServiceSummary,
    DashboardServiceHealth,
    DashboardServiceSeries,
  ],
})
export class DashboardModule {}
