import { Kysely, sql } from 'kysely';
import { DB } from '../../commons/database/db.types';

// Seleção comum de listar e consultar campanha: as colunas da campanha mais os dados públicos do pesquisador e da
// área, para o front não baixar os catálogos inteiros só para resolver os nomes.
//
// - `usuario`/`area_conhecimento` entram por LEFT JOIN: a RLS pode esconder o usuário (ex.: conta excluída), e
// `perfil_pesquisador` pode não ter vínculo institucional. A campanha continua aparecendo sem esses dados.
// - `precisa_revisao_score`: SINAL para o admin, na fila de aprovação, de que o pesquisador está abaixo de
// score_minimo_campanha (fn_precisa_revisao_score, 05 [05-I-1]). Só vem para quem pode aprovar e só para
// campanha aguardando aprovação; nos outros casos é null. Nunca bloqueia nada.
export function selecionarCampanhaComNomes(db: Kysely<DB>) {
  return db
    .selectFrom('campanha')
    .leftJoin('usuario', 'usuario.id_usuario', 'campanha.id_usuario')
    .leftJoin(
      'perfil_pesquisador',
      'perfil_pesquisador.id_usuario',
      'campanha.id_usuario',
    )
    .leftJoin(
      'area_conhecimento',
      'area_conhecimento.id_area_conhecimento',
      'campanha.id_area_conhecimento',
    )
    .leftJoin('arquivo as arquivo_capa', (join) =>
      join
        .onRef('arquivo_capa.id_arquivo', '=', 'campanha.id_imagem_capa')
        .on('arquivo_capa.ativo', '=', true),
    )
    .selectAll('campanha')
    .select([
      'usuario.nome as nome_pesquisador',
      sql<string | null>`CASE
        WHEN perfil_pesquisador.tipo_vinculo = 'institucional'
        THEN perfil_pesquisador.vinculo_institucional
      END`.as('instituicao_pesquisador'),
      'area_conhecimento.nome as nome_area',
      'arquivo_capa.chave as imagem_capa_chave',
    ])
    .select(
      sql<boolean | null>`CASE
        WHEN campanha.status = 'aguardando_aprovacao' AND public.tem_permissao('campanha_aprovar')
        THEN public.fn_precisa_revisao_score(campanha.id_usuario)
      END`.as('precisa_revisao_score'),
    );
}
