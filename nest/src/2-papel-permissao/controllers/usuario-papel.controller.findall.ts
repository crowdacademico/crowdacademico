import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioPapelServiceFindAll } from '../service/usuario-papel.service.findall';

// COM RequireAuthGuard desde 24-09-2026: quem tem qual papel revela quem é
// administrador. A decisão antiga ("sem guard, só admin chega na tela") não
// protegia a rota, só a tela; ver PENDENCIAS. Usado pelo modal de usuário.
@Controller('usuario-papel')
@UseGuards(RequireAuthGuard)
export class UsuarioPapelControllerFindAll {
  constructor(private readonly service: UsuarioPapelServiceFindAll) {}

  @Get(':idUsuario')
  listar(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.service.executar(idUsuario);
  }
}
