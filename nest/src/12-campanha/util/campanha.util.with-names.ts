import { Kysely, sql } from 'kysely';
import { DB } from '../../commons/database/db.types';

// Seleção comum de listar e consultar campanha: as colunas da campanha mais o NOME do pesquisador e da área,
// para o front não baixar o catálogo inteiro de usuários e de áreas só para resolver dois nomes.
//
// - `usuario`/`area_conhecimento` entram por LEFT JOIN: a RLS pode esconder o usuário (ex.: conta excluída), e
// a campanha continua aparecendo, só sem o nome.
// - `precisa_revisao_score`: SINAL para o admin, na fila de aprovação, de que o pesquisador está abaixo de
// score_minimo_campanha (fn_precisa_revisao_score, 05 [05-I-1]). Só vem para quem pode aprovar e só para
// campanha aguardando aprovação; nos outros casos é null. Nunca bloqueia nada.
export function selecionarCampanhaComNomes(db: Kysely<DB>) {
  return db
    .selectFrom('campanha')
    .leftJoin('usuario', 'usuario.id_usuario', 'campanha.id_usuario')
    .leftJoin(
      'area_conhecimento',
      'area_conhecimento.id_area_conhecimento',
      'campanha.id_area_conhecimento',
    )
    .selectAll('campanha')
    .select([
      'usuario.nome as nome_pesquisador',
      'area_conhecimento.nome as nome_area',
    ])
    .select(
      sql<boolean | null>`CASE
        WHEN campanha.status = 'aguardando_aprovacao' AND public.tem_permissao('campanha_aprovar')
        THEN public.fn_precisa_revisao_score(campanha.id_usuario)
      END`.as('precisa_revisao_score'),
    );
}
