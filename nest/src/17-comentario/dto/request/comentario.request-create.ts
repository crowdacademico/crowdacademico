import { IsInt, IsString, MaxLength } from 'class-validator';

// id_pesquisador NUNCA vem daqui (sempre request.user.idUsuario) - RLS
// (pol_comentario_insert, 04) exige isso, e validar_comentario_autor (05,
// [05-K-3]) já barra o dono da campanha comentar na própria.
//
// SEM `endossado` (15-09-2026, achado numa auditoria RF x implementação -
// RF-089) - ERA opcional aqui, deixando o próprio autor do comentário se
// autoendossar na hora de criar, sem o dono da campanha aprovar nada.
// Endossar é sempre uma ação SEPARADA e POSTERIOR do dono (ver
// ComentarioRequestUpdate) - todo comentário novo nasce sem endosso, e o
// banco agora garante isso incondicionalmente também (trg_comentario_
// ignora_endosso_criacao, 05), então nem uma versão futura desta rota
// aceitando o campo por engano furaria a regra.
export class ComentarioRequestCreate {
  @IsInt()
  idCampanha: number;

  @IsString()
  @MaxLength(500)
  conteudo: string;
}
