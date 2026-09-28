import { Module } from '@nestjs/common';
import { HistoricoRejeicaoControllerFindAll } from './controllers/historico-rejeicao.controller.findall';
import { HistoricoRejeicaoServiceFindAll } from './service/historico-rejeicao.service.findall';

@Module({
  controllers: [HistoricoRejeicaoControllerFindAll],
  providers: [HistoricoRejeicaoServiceFindAll],
})
export class HistoricoRejeicaoModule {}
