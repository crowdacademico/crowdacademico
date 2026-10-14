import { Kysely } from 'kysely';
import { DB } from '../../commons/database/db.types';
import { DENUNCIA_COLUNAS_SELECT } from '../constants/denuncia.constants';

// A denúncia com o que a moderação lê junto (RF-113, RF-116): motivo, quem denunciou (nome e e-mail), a campanha
// ou o pesquisador denunciado, quem julgou e quem decidiu a contestação. LEFT JOIN: conta excluída ou campanha que a RLS não mostra deixam o nome vazio, não
// somem com a denúncia.
export function consultaDenunciaComDetalhes(db: Kysely<DB>) {
  return db
    .selectFrom('denuncia')
    .innerJoin(
      'motivo_denuncia',
      'motivo_denuncia.id_motivo',
      'denuncia.id_motivo',
    )
    .leftJoin(
      'usuario as denunciante',
      'denunciante.id_usuario',
      'denuncia.id_usuario',
    )
    .leftJoin('campanha', 'campanha.id_campanha', 'denuncia.id_campanha_alvo')
    .leftJoin(
      'usuario as alvo',
      'alvo.id_usuario',
      'denuncia.id_pesquisador_alvo',
    )
    .leftJoin(
      'usuario as julgador',
      'julgador.id_usuario',
      'denuncia.id_julgador',
    )
    .leftJoin(
      'usuario as julgador_contestacao',
      'julgador_contestacao.id_usuario',
      'denuncia.id_julgador_contestacao',
    )
    .select(
      DENUNCIA_COLUNAS_SELECT.map((coluna) => `denuncia.${coluna}` as const),
    )
    .select([
      'motivo_denuncia.descricao as motivo',
      'motivo_denuncia.tipo as tipo_motivo',
      'denunciante.nome as nome_denunciante',
      'denunciante.email as email_denunciante',
      'campanha.titulo as titulo_campanha',
      'campanha.status as status_campanha',
      'alvo.nome as nome_pesquisador_alvo',
      'julgador.nome as nome_julgador',
      'julgador_contestacao.nome as nome_julgador_contestacao',
    ]);
}
