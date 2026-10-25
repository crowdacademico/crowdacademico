import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { AutorizacaoService } from '../../commons/seguranca/autorizacao.service';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import { AnexoAtualizacaoResponse } from '../dto/response/anexo-atualizacao.response';

interface LinhaAnexo {
  tipo: 'arquivo' | 'link';
  id_anexo: number;
  id_atualizacao: number;
  titulo_atualizacao: string;
  atualizacao_ativa: boolean;
  id_campanha: number;
  titulo_campanha: string | null;
  nome: string;
  chave: string | null;
  url: string | null;
  quando: Date;
}

// Todos os anexos das atualizações de campanha (arquivos e links), só leitura, o mais novo primeiro. O arquivo
// conta da data do envio; o link não guarda data própria e conta da publicação da atualização. A tela é de quem
// tem atualizacao_moderar (admin e moderador): sem ela, 403, e não uma lista pela metade (a RLS mostraria a
// qualquer um os anexos das atualizações públicas).
@Injectable()
export class AnexoAtualizacaoServiceFindAll {
  constructor(
    private readonly database: DatabaseService,
    private readonly autorizacao: AutorizacaoService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async executar(limite = 500): Promise<AnexoAtualizacaoResponse[]> {
    await this.autorizacao.exigirPermissao(
      'atualizacao_moderar',
      'Você não tem permissão para ver os anexos das atualizações.',
    );
    const resultado = await sql<LinhaAnexo>`
      SELECT * FROM (
        SELECT 'arquivo' AS tipo, aa.id_arq_atu AS id_anexo, a.id_atualizacao, a.titulo AS titulo_atualizacao,
               a.ativo AS atualizacao_ativa, a.id_campanha, c.titulo AS titulo_campanha, ar.nome_original AS nome,
               ar.chave, NULL::text AS url, ar.criado_em AS quando
        FROM arquivo_atualizacao aa
        JOIN atualizacao_campanha a ON a.id_atualizacao = aa.id_atualizacao
        JOIN arquivo ar ON ar.id_arquivo = aa.id_arquivo
        LEFT JOIN campanha c ON c.id_campanha = a.id_campanha
        UNION ALL
        SELECT 'link', la.id_link_atualizacao, a.id_atualizacao, a.titulo, a.ativo, a.id_campanha, c.titulo,
               COALESCE(tl.nome, 'Link'), NULL, la.url, a.publicado_em
        FROM link_atualizacao la
        JOIN atualizacao_campanha a ON a.id_atualizacao = la.id_atualizacao
        LEFT JOIN tipo_link tl ON tl.id_tipolink = la.id_tipolink
        LEFT JOIN campanha c ON c.id_campanha = a.id_campanha
      ) anexos
      ORDER BY quando DESC, tipo, id_anexo DESC
      LIMIT ${limite}::int
    `.execute(this.database.getDb());
    return resultado.rows.map((linha) => ({
      tipo: linha.tipo,
      idAnexo: linha.id_anexo,
      idAtualizacao: linha.id_atualizacao,
      tituloAtualizacao: linha.titulo_atualizacao,
      atualizacaoAtiva: linha.atualizacao_ativa,
      idCampanha: linha.id_campanha,
      tituloCampanha: linha.titulo_campanha,
      nome: linha.nome,
      url:
        linha.chave === null
          ? linha.url
          : this.armazenamento.montarUrlPublica(linha.chave),
      quando: linha.quando,
    }));
  }
}
