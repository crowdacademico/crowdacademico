import { Controller, Post } from '@nestjs/common';
import {
  PagamentoServiceSyncFees,
  type ResultadoSincronizacaoTarifas,
} from '../service/pagamento.service.sync-fees';

@Controller('pagamento/tarifas')
export class PagamentoControllerSyncFees {
  constructor(private readonly service: PagamentoServiceSyncFees) {}

  // O botão "Sincronizar com o provedor" de Parâmetros. Exige configuracao_gerenciar (403 sem ela).
  @Post('sincronizar')
  sincronizar(): Promise<ResultadoSincronizacaoTarifas> {
    return this.service.sincronizarPeloPainel();
  }
}
