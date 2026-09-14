import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { TermoUsoServiceListar } from '../service/termo-uso.service.listar';

// Diferente de /termos-uso/ativo (público): esta é a listagem completa
// (histórico incluso), pra tela de administração - exige sessão.
@Controller('termos-uso')
export class TermoUsoControllerListar {
  constructor(private readonly service: TermoUsoServiceListar) {}

  @Get()
  @UseGuards(RequireAuthGuard)
  listar() {
    return this.service.executar();
  }
}
