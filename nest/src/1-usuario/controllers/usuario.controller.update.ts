import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
// import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtualizarUsuarioRequestDto } from '../dto/request/atualizar-usuario.request.dto';
import { UsuarioServiceUpdate } from '../service/usuario.service.update';

@Controller('usuario')
export class UsuarioControllerUpdate {
  constructor(private readonly service: UsuarioServiceUpdate) {}

  @Patch(':id')
  // ⚠️ SUSPENSO PARA DESENVOLVIMENTO (02-08-2026) — ver temp_Nest_React.md,
  // seção "Login suspenso para dev". Reativar antes de qualquer uso real.
  // @UseGuards(RequireAuthGuard)
  atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarUsuarioRequestDto,
  ) {
    return this.service.executar(id, dto);
  }
}
