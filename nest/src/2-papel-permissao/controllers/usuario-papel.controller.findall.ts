import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsuarioPapelServiceFindAll } from '../service/usuario-papel.service.findall';

// Exige login (guarda global, não é @Publico()): quem tem qual papel revela quem é administrador; "sem guard, só admin chega na tela"
// não protegia a rota, só a tela. Usado pelo modal de usuário.
@Controller('usuario-papel')
export class UsuarioPapelControllerFindAll {
  constructor(private readonly service: UsuarioPapelServiceFindAll) {}

  @Get(':idUsuario')
  listar(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.executar(idUsuario);
  }
}
