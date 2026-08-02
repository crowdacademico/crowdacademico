import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
// import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtualizarConfiguracaoRequestDto } from '../dto/request/atualizar-configuracao.request.dto';
import { ConfiguracaoServiceUpdate } from '../service/configuracao.service.update';

@Controller('configuracoes')
export class ConfiguracaoControllerUpdate {
  constructor(private readonly service: ConfiguracaoServiceUpdate) {}

  @Patch(':id')
  // ⚠️ SUSPENSO PARA DESENVOLVIMENTO (02-08-2026) — ver temp_Nest_React.md,
  // seção "Login suspenso para dev". Reativar antes de qualquer uso real.
  // @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarConfiguracaoRequestDto,
  ) {
    return this.service.executar(id, dto);
  }
}
