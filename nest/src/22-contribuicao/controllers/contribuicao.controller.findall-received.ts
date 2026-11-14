import { Controller, Get } from '@nestjs/common';
import { ContribuicaoServiceFindAllReceived } from '../service/contribuicao.service.findall-received';

@Controller('contribuicao')
export class ContribuicaoControllerFindAllReceived {
  constructor(private readonly service: ContribuicaoServiceFindAllReceived) {}

  @Get('recebidas')
  listar() {
    return this.service.executar();
  }
}
