import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CampanhaServiceFindOne } from '../service/campanha.service.findone';

// Sem @UseGuards - página pública de campanha. JwtAuthGuard é GLOBAL
// (auth.module.ts) e já popula request.user quando existe Bearer válido,
// mas o service nem precisa disso: pol_campanha_select (04) já usa
// id_usuario_atual() internamente (via SET LOCAL do GlobalDbInterceptor)
// pra decidir visibilidade, sem o controller precisar repassar nada.
@Controller('campanha')
export class CampanhaControllerFindOne {
  constructor(private readonly service: CampanhaServiceFindOne) {}

  @Get(':id')
  buscar(@Param('id', ParseIntPipe) id: number) {
    return this.service.executar(id);
  }
}
