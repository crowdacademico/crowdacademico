import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { ConfiguracaoValorService } from '../../commons/configuracao/configuracao-valor.service';
import { DatabaseService } from '../../commons/database/database.service';
import { CAMPANHA_COLUNAS_SELECT } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaResponse } from '../dto/response/campanha.response';

@Injectable()
export class CampanhaServiceFindOne {
  constructor(
    private readonly database: DatabaseService,
    private readonly configuracaoValor: ConfiguracaoValorService,
  ) {}

  async executar(id: number): Promise<CampanhaResponse> {
    const linha = await this.database
      .getDb()
      .selectFrom('campanha')
      .select(CAMPANHA_COLUNAS_SELECT)
      .where('id_campanha', '=', id)
      .executeTakeFirst();

    // pol_campanha_select (04) já filtra campanha 'rascunho'/
    // 'aguardando_aprovacao'/'rejeitado'/'encerrado_moderacao' fora do alcance de quem não é dono
    // nem tem relatorio_visualizar - "não encontrada" cobre tanto o caso
    // de não existir quanto o de existir mas estar fora da visão de quem
    // pediu (não vaza a existência de campanha ainda não aprovada).
    if (!linha) {
      throw new NotFoundException('Campanha não encontrada.');
    }

    const resposta = CampanhaConverter.paraResponseDto(linha);
    if (linha.status === 'rejeitado') {
      await this.preencherReenvios(resposta);
    }
    return resposta;
  }

  // Números do ciclo de rejeição e reenvio (ver REQUISITOS_V7). A regra mora no
  // banco (fn_campanha_reenvios_esgotados e fn_valida_transicao_campanha, 05):
  // esta conta só ESPELHA o que o banco vai decidir, pra tela e o e-mail
  // poderem mostrar "restam N reenvios até dd/mm" sem tentar reenviar pra
  // descobrir. Consultas em sequência, não Promise.all: a conexão é uma só por
  // requisição (ver commons/database/paginacao.util.ts).
  //
  // O histórico passa pela RLS de quem consulta (pol_historicorej_select, 04):
  // o dono e quem tem campanha_rejeitar enxergam tudo, então pra esses o
  // resultado é exato. Um perfil que só tem relatorio_visualizar veria 0
  // rejeições, e nesse caso os números aqui são apenas indicativos.
  private async preencherReenvios(resposta: CampanhaResponse): Promise<void> {
    const maxReenvios = await this.configuracaoValor.buscarNumero(
      'campanha_rejeitada_max_reenvios',
      3,
    );
    const prazoDias = await this.configuracaoValor.buscarNumero(
      'campanha_rejeitada_prazo_dias',
      30,
    );
    const historico = await this.database
      .getDb()
      .selectFrom('historico_rejeicao')
      .select([
        sql<string>`count(*)`.as('total'),
        sql<Date | null>`max(rejeitado_em)`.as('ultima'),
      ])
      .where('id_campanha', '=', resposta.idCampanha)
      .executeTakeFirst();

    const rejeicoes = Math.max(Number(historico?.total ?? 0), 1);
    resposta.reenviosRestantes = Math.max(0, maxReenvios - (rejeicoes - 1));
    resposta.somenteLeitura = rejeicoes > maxReenvios;
    if (historico?.ultima) {
      const limite = new Date(historico.ultima);
      limite.setDate(limite.getDate() + prazoDias);
      resposta.prazoReenvioAte = limite;
    }
  }
}
