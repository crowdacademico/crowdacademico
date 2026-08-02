import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
// import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { ConfiguracaoServiceRemove } from '../service/configuracao.service.remove';

@Controller('configuracoes')
export class ConfiguracaoControllerRemove {
  constructor(private readonly service: ConfiguracaoServiceRemove) {}

  @Delete(':id')
  @HttpCode(204)
  // ⚠️ SUSPENSO PARA DESENVOLVIMENTO (02-08-2026) — ver temp_Nest_React.md,
  // seção "Login suspenso para dev". Reativar antes de qualquer uso real.
  // @UseGuards(RequireAuthGuard)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
