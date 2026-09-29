import { IsInt, IsString, Matches, MaxLength } from 'class-validator';

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

  // Precisa ter algum caractere que não seja espaço: cada pesquisador comenta uma vez por campanha, e um texto
  // vazio gastaria a vaga (o banco também barra, CK_COMENTARIO_CONTEUDO_NAO_VAZIO).
  @IsString()
  @Matches(/\S/, {
    message: 'Escreva o comentário (não pode ficar em branco).',
  })
  @MaxLength(500, {
    message: 'O comentário pode ter no máximo 500 caracteres.',
  })
  conteudo: string;
}
