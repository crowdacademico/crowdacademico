import { Controller, Get } from '@nestjs/common';
import { PapelServiceFindAll } from '../service/papel.service.findall';

@Controller('papel')
export class PapelControllerFindAll {
  constructor(private readonly service: PapelServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
