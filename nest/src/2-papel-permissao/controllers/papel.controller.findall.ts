import { Controller, Get } from '@nestjs/common';
import { PapelServiceFindAll } from '../service/papel.service.findall';
import { Publico } from '../../commons/auth/publico.decorator';

@Controller('papel')
export class PapelControllerFindAll {
  constructor(private readonly service: PapelServiceFindAll) {}

  @Get()
  @Publico()
  listar() {
    return this.service.executar();
  }
}
