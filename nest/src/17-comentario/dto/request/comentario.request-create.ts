import { IsInt, IsString, MaxLength } from 'class-validator';

// id_pesquisador NUNCA vem daqui (sempre request.user.idUsuario): a RLS (pol_comentario_insert, 04) exige isso,
// e validar_comentario_autor (05, [05-K-3]) já barra o dono da campanha comentar na própria.
//
// SEM `endossado` (RF-089): deixá-lo opcional aqui permitiria o próprio autor do comentário se autoendossar na
// hora de criar, sem o dono da campanha aprovar nada. Endossar é sempre uma ação SEPARADA e POSTERIOR do dono
// (ver ComentarioRequestUpdate); todo comentário novo nasce sem endosso, e o banco garante isso
// incondicionalmente também (trg_comentario_ignora_endosso_criacao, 05), então nem uma versão futura desta rota
// aceitando o campo por engano furaria a regra.
export class ComentarioRequestCreate {
  @IsInt()
  idCampanha: number;

  @IsString()
  @MaxLength(500)
  conteudo: string;
}
