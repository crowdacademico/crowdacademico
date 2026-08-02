import { Body, Controller, Post } from '@nestjs/common';
// import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { AtribuirPapelRequestDto } from '../dto/request/atribuir-papel.request.dto';
import { UsuarioPapelServiceCreate } from '../service/usuario-papel.service.create';

@Controller('usuario-papel')
export class UsuarioPapelControllerCreate {
  constructor(private readonly service: UsuarioPapelServiceCreate) {}

  @Post()
  // ⚠️ SUSPENSO PARA DESENVOLVIMENTO (02-08-2026) — ver temp_Nest_React.md,
  // seção "Login suspenso para dev". Reativar antes de qualquer uso real.
  // @UseGuards(RequireAuthGuard)
  atribuir(@Body() dto: AtribuirPapelRequestDto) {
    return this.service.executar(dto);
  }
}
