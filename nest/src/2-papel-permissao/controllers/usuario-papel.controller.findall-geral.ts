import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioPapelServiceFindAllGeral } from '../service/usuario-papel.service.findall-geral';

// GET /usuario-papel (sem :idUsuario) — não conflita com o findall
// filtrado (GET /usuario-papel/:idUsuario) porque Nest casa rota por
// número de segmentos: esta exige zero segmentos extras, a outra exige
// exatamente um.
@Controller('usuario-papel')
export class UsuarioPapelControllerFindAllGeral {
  constructor(private readonly service: UsuarioPapelServiceFindAllGeral) {}

  @Get()
  @UseGuards(RequireAuthGuard)
  listar() {
    return this.service.executar();
  }
}
