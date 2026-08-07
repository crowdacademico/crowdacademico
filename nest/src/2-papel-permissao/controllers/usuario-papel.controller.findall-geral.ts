import { Controller, Get } from '@nestjs/common';
import { UsuarioPapelServiceFindAllGeral } from '../service/usuario-papel.service.findall-geral';

// GET /usuario-papel (sem :idUsuario) — não conflita com o findall
// filtrado (GET /usuario-papel/:idUsuario) porque Nest casa rota por
// número de segmentos: esta exige zero segmentos extras, a outra exige
// exatamente um.
//
// SEM RequireAuthGuard, DE PROPÓSITO (07-08-2026, pedido do Lucas): este
// painel admin, em qualquer versão futura do sistema, só é alcançado por
// admin — usuário comum e pesquisador nunca chegam nem perto dele. Não é
// gambiarra: mesmo padrão já usado por PapelControllerFindAll (catálogo
// papel) e UsuarioControllerFindAll (lista de usuário) — ambos também sem
// guard, apoiados na RLS (pol_usuariopapel_select agora é USING(true), ver
// "ATUALIZAR O SUPABASE.sql"). id_usuario_atual() só retorna NULL pra quem
// não está logado; a policy nem olha pra isso.
@Controller('usuario-papel')
export class UsuarioPapelControllerFindAllGeral {
  constructor(private readonly service: UsuarioPapelServiceFindAllGeral) {}

  @Get()
  listar() {
    return this.service.executar();
  }
}
