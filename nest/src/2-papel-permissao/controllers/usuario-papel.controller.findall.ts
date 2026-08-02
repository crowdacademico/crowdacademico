import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
// import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioPapelServiceFindAll } from '../service/usuario-papel.service.findall';

@Controller('usuario-papel')
export class UsuarioPapelControllerFindAll {
  constructor(private readonly service: UsuarioPapelServiceFindAll) {}

  @Get(':idUsuario')
  // ⚠️ SUSPENSO PARA DESENVOLVIMENTO (02-08-2026, era o que dava "Esta rota
  // exige login." no widget "Papéis de um usuário" sem estar logado) — ver
  // temp_Nest_React.md, seção "Login suspenso para dev". Reativar antes de
  // qualquer uso real.
  // @UseGuards(RequireAuthGuard)
  listar(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.executar(idUsuario);
  }
}
