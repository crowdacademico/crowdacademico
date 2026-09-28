import { Module } from '@nestjs/common';
import { HistoricoRejeicaoControllerListar } from './controllers/historico-rejeicao.controller.findall';
import { HistoricoRejeicaoServiceListar } from './service/historico-rejeicao.service.findall';

@Module({
  controllers: [HistoricoRejeicaoControllerListar],
  providers: [HistoricoRejeicaoServiceListar],
})
export class HistoricoRejeicaoModule {}
