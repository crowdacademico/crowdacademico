import { Kysely, sql } from 'kysely';
import { DB } from '../../commons/database/db.types';
import { SOLICITACAO_ENCERRAMENTO_COLUNAS_SELECT } from '../constants/solicitacao-encerramento.constants';

// O pedido com o que quem decide precisa ler junto (RF-065): campanha (título, modelo, status, arrecadado), quem
// pediu, quem decidiu e quantas contribuições confirmadas a campanha tem. LEFT JOIN: conta ou campanha que a RLS
// não mostra deixam o campo vazio, não somem com o pedido. A contagem segue a RLS de contribuicao (quem decide vê
// todas, pela permissão de ver contribuições).
export function consultaSolicitacaoComDetalhes(db: Kysely<DB>) {
  return db
    .selectFrom('solicitacao_encerramento')
    .leftJoin(
      'campanha',
      'campanha.id_campanha',
      'solicitacao_encerramento.id_campanha',
    )
    .leftJoin(
      'usuario as pesquisador',
      'pesquisador.id_usuario',
      'campanha.id_usuario',
    )
    .leftJoin(
      'usuario as admin',
      'admin.id_usuario',
      'solicitacao_encerramento.id_admin',
    )
    .select(
      SOLICITACAO_ENCERRAMENTO_COLUNAS_SELECT.map(
        (coluna) => `solicitacao_encerramento.${coluna}` as const,
      ),
    )
    .select([
      'campanha.titulo as titulo_campanha',
      'campanha.status as status_campanha',
      'campanha.modelo as modelo_campanha',
      'campanha.valor_bruto_arrecadado as valor_arrecadado',
      'campanha.id_usuario as id_pesquisador',
      'pesquisador.nome as nome_pesquisador',
      'admin.nome as nome_admin',
    ])
    .select(
      sql<number>`(SELECT count(*) FROM contribuicao ct WHERE ct.id_campanha = solicitacao_encerramento.id_campanha AND ct.status IN ('confirmado', 'repassado'))`.as(
        'contribuicoes_confirmadas',
      ),
    );
}
