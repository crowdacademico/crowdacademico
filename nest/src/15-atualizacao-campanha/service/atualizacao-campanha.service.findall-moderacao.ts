import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../commons/database/database.service';
import { AtualizacaoCampanhaConverter } from '../dto/converter/atualizacao-campanha.converter';
import { AtualizacaoModeracaoResponse } from '../dto/response/atualizacao-campanha.response';
import { AnexoAtualizacaoService } from './anexo-atualizacao.service';

// As atualizações de todas as campanhas, com os anexos, a mais nova primeiro: a tela de moderação (RF-053). Como a lista
// de denúncias, sem 403: pol_atualizacao_select (04) mostra tudo a quem tem atualizacao_moderar e, aos outros, as
// visíveis e as próprias ocultas.
@Injectable()
export class AtualizacaoCampanhaServiceFindAllModeracao {
  constructor(
    private readonly database: DatabaseService,
    private readonly anexos: AnexoAtualizacaoService,
  ) {}

  async executar(limite = 500): Promise<AtualizacaoModeracaoResponse[]> {
    const linhas = await this.database
      .getDb()
      .selectFrom('atualizacao_campanha as a')
      .leftJoin('campanha as c', 'c.id_campanha', 'a.id_campanha')
      .selectAll('a')
      .select('c.titulo as titulo_campanha')
      .orderBy('a.publicado_em', 'desc')
      .orderBy('a.id_atualizacao', 'desc')
      .limit(limite)
      .execute();
    const anexos = await this.anexos.porAtualizacao(
      linhas.map((linha) => linha.id_atualizacao),
    );
    return linhas.map((linha) => ({
      ...AtualizacaoCampanhaConverter.paraResponseDto(
        linha,
        anexos.get(linha.id_atualizacao),
      ),
      tituloCampanha: linha.titulo_campanha,
    }));
  }
}
