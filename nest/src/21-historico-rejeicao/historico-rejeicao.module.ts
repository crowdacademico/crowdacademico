import { Module } from '@nestjs/common';
import { HistoricoRejeicaoControllerListar } from './controllers/historico-rejeicao.controller.listar';
import { HistoricoRejeicaoServiceListar } from './service/historico-rejeicao.service.listar';

@Module({
  controllers: [HistoricoRejeicaoControllerListar],
  providers: [HistoricoRejeicaoServiceListar],
})
export class HistoricoRejeicaoModule {}
