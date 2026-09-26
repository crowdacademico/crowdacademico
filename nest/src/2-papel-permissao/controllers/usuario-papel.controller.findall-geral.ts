import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireAuthGuard } from '../../3-auth/guards/require-auth.guard';
import { UsuarioPapelServiceFindAllGeral } from '../service/usuario-papel.service.findall-geral';

// GET /usuario-papel (sem :idUsuario) não conflita com o findall filtrado (GET /usuario-papel/:idUsuario)
// porque o Nest casa rota por número de segmentos: esta exige zero segmentos extras, a outra exige exatamente
// um.
//
// COM RequireAuthGuard: a API não sabe de tela nenhuma ("só o admin chega neste painel" não protege a rota, só
// a tela), e a lista mostra quem é administrador. O guard só impede o anônimo; a visibilidade por linha é da
// RLS (pol_usuariopapel_select, 04): cada pessoa vê os próprios vínculos, e quem tem papel_gerenciar vê os de
// todos.
@UseGuards(RequireAuthGuard)
@Controller('usuario-papel')
export class UsuarioPapelControllerFindAllGeral {
  constructor(private readonly service: UsuarioPapelServiceFindAllGeral) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
