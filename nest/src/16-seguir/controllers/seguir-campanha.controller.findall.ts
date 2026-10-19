import { Controller, Get } from '@nestjs/common';
import { SeguirCampanhaServiceFindAll } from '../service/seguir-campanha.service.findall';
import { UsuarioAtual } from '../../commons/auth/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';

@Controller('seguir-campanha')
export class SeguirCampanhaControllerFindAll {
  constructor(private readonly service: SeguirCampanhaServiceFindAll) {}

  @Get()
  listar(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(usuario.idUsuario);
  }
}
