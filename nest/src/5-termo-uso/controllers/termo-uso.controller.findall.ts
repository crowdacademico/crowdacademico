import { Controller, Get } from '@nestjs/common';
import { TermoUsoServiceFindAll } from '../service/termo-uso.service.findall';

// Diferente de /termos-uso/ativo (público): esta é a listagem completa
// (histórico incluso), pra tela de administração - exige sessão.
@Controller('termos-uso')
export class TermoUsoControllerFindAll {
  constructor(private readonly service: TermoUsoServiceFindAll) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
