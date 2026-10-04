import { Controller, Get } from '@nestjs/common';
import { DenunciaServiceFindAgainstMe } from '../service/denuncia.service.find-against-me';

@Controller('denuncia')
export class DenunciaControllerFindAgainstMe {
  constructor(private readonly service: DenunciaServiceFindAgainstMe) {}

  @Get('contra-mim')
  listar() {
    return this.service.executar();
  }
}
