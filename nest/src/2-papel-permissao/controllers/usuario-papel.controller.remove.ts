import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
// import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioPapelServiceRemove } from '../service/usuario-papel.service.remove';

@Controller('usuario-papel')
export class UsuarioPapelControllerRemove {
  constructor(private readonly service: UsuarioPapelServiceRemove) {}

  @Delete(':idUsuario/:idPapel')
  @HttpCode(204)
  // ⚠️ SUSPENSO PARA DESENVOLVIMENTO (02-08-2026) — ver temp_Nest_React.md,
  // seção "Login suspenso para dev". Reativar antes de qualquer uso real.
  // @UseGuards(RequireAuthGuard)
  remover(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idPapel', ParseIntPipe) idPapel: number,
  ) {
    return this.service.executar(idUsuario, idPapel);
  }
}
