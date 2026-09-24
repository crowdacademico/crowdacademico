import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaResponse } from '../dto/response/campanha.response';
import { selecionarCampanhaComNomes } from './campanha-com-nomes.util';

@Injectable()
export class CampanhaServiceFindOne {
  constructor(private readonly database: DatabaseService) {}

  async executar(id: number): Promise<CampanhaResponse> {
    const linha = await selecionarCampanhaComNomes(this.database.getDb())
      .where('campanha.id_campanha', '=', id)
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

  // Números do ciclo de rejeição e reenvio (ver REQUISITOS_V7). A conta inteira
  // mora no banco, em fn_campanha_situacao_reenvio (05, [05-K-2-B]): a MESMA
  // função que a trigger de transição e o job de expirar rejeitadas usam, então
  // a tela mostra exatamente o que o banco vai decidir (antes esta classe
  // refazia a conta em TypeScript, com os padrões 3 e 30 repetidos aqui).
  // É SECURITY DEFINER: os números saem exatos para quem já enxerga a campanha
  // (dono e quem tem relatorio_visualizar), mesmo sem acesso à tabela de
  // histórico, que a RLS restringe.
  private async preencherReenvios(resposta: CampanhaResponse): Promise<void> {
    const resultado = await sql<{
      reenvios_restantes: number;
      somente_leitura: boolean;
      prazo_reenvio_ate: Date | null;
    }>`SELECT * FROM public.fn_campanha_situacao_reenvio(${resposta.idCampanha})`.execute(
      this.database.getDb(),
    );
    const situacao = resultado.rows[0];
    resposta.reenviosRestantes = situacao.reenvios_restantes;
    resposta.somenteLeitura = situacao.somente_leitura;
    resposta.prazoReenvioAte = situacao.prazo_reenvio_ate;
  }
}
