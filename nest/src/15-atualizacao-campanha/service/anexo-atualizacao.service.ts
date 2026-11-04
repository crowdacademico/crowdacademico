import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { ARMAZENAMENTO_SERVICE } from '../../commons/storage/storage.constants';
import type { ArmazenamentoService } from '../../commons/storage/storage.service.interface';
import { AnexoAtualizacaoResponse } from '../dto/response/anexo-atualizacao.response';

// Os anexos (arquivos e links) de várias atualizações de uma vez, agrupados pelo id da atualização: os arquivos na
// ordem do envio, depois os links na ordem deles. A leitura é pública (pol_arqatu_select e pol_link_atualizacao_select).
@Injectable()
export class AnexoAtualizacaoService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(ARMAZENAMENTO_SERVICE)
    private readonly armazenamento: ArmazenamentoService,
  ) {}

  async porAtualizacao(
    ids: number[],
  ): Promise<Map<number, AnexoAtualizacaoResponse[]>> {
    const mapa = new Map<number, AnexoAtualizacaoResponse[]>();
    if (ids.length === 0) return mapa;
    const db = this.database.getDb();
    const [arquivos, links] = await Promise.all([
      db
        .selectFrom('arquivo_atualizacao as aa')
        .innerJoin('arquivo as ar', 'ar.id_arquivo', 'aa.id_arquivo')
        .select([
          'aa.id_arq_atu',
          'aa.id_atualizacao',
          'ar.nome_original',
          'ar.tipo_mime',
          'ar.chave',
        ])
        .where('aa.id_atualizacao', 'in', ids)
        .orderBy('aa.id_arq_atu')
        .execute(),
      db
        .selectFrom('link_atualizacao as la')
        .leftJoin('tipo_link as tl', 'tl.id_tipolink', 'la.id_tipolink')
        .select([
          'la.id_link_atualizacao',
          'la.id_atualizacao',
          'la.url',
          'tl.nome',
        ])
        .where('la.id_atualizacao', 'in', ids)
        .orderBy('la.ordem')
        .orderBy('la.id_link_atualizacao')
        .execute(),
    ]);
    const anexar = (id: number, anexo: AnexoAtualizacaoResponse) =>
      mapa.set(id, [...(mapa.get(id) ?? []), anexo]);
    for (const a of arquivos) {
      anexar(a.id_atualizacao, {
        tipo: 'arquivo',
        idAnexo: a.id_arq_atu,
        nome: a.nome_original,
        tipoMime: a.tipo_mime,
        url: this.armazenamento.montarUrlPublica(a.chave),
      });
    }
    for (const l of links) {
      anexar(l.id_atualizacao, {
        tipo: 'link',
        idAnexo: l.id_link_atualizacao,
        nome: l.nome ?? 'Link',
        tipoMime: null,
        url: l.url,
      });
    }
    return mapa;
  }
}
