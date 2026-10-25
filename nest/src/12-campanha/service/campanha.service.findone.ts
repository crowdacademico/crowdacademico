import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'kysely';
import { DatabaseService } from '../../commons/database/database.service';
import { CAMPO_BLOQUEADO_PARA_DTO } from '../constants/campanha.constants';
import { CampanhaConverter } from '../dto/converter/campanha.converter';
import { CampanhaResponse } from '../dto/response/campanha.response';
import { selecionarCampanhaComNomes } from '../util/campanha.util.with-names';

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
    await this.preencherCamposBloqueados(resposta);
    await this.preencherLiquidoEstimado(resposta);
    await this.preencherAprovador(resposta);
    await this.preencherEncerrador(resposta);
    return resposta;
  }

  // Quem aprovou: id_admin só é carimbado na aprovação ou na rejeição, e a rejeição só acontece antes de aprovar,
  // então numa campanha aprovada ele é sempre quem aprovou. Só para quem pode aprovar (ver nomeAprovador no DTO).
  private async preencherAprovador(resposta: CampanhaResponse): Promise<void> {
    const resultado = await sql<{ nome: string | null }>`
      SELECT CASE WHEN public.tem_permissao('campanha_aprovar') THEN u.nome END AS nome
      FROM campanha c
      LEFT JOIN usuario u ON u.id_usuario = c.id_admin
      WHERE c.id_campanha = ${resposta.idCampanha} AND c.aprovado_em IS NOT NULL
    `.execute(this.database.getDb());
    resposta.nomeAprovador = resultado.rows[0]?.nome ?? null;
  }

  // Quem encerrou: a última linha do log de auditoria que levou a campanha à situação final de hoje. Sem responsável
  // = tarefa automática ("Sistema"). Só para quem pode aprovar (ver nomeEncerrador no DTO); a leitura do log ainda
  // passa pela RLS (log_visualizar).
  private async preencherEncerrador(resposta: CampanhaResponse): Promise<void> {
    const resultado = await sql<{ nome: string | null }>`
      SELECT CASE WHEN public.tem_permissao('campanha_aprovar') THEN
               CASE WHEN l.id_log IS NULL THEN NULL
                    WHEN l.id_usuario_responsavel IS NULL THEN 'Sistema'
                    ELSE u.nome END
             END AS nome
      FROM campanha c
      LEFT JOIN LATERAL (
        SELECT la.id_log, la.id_usuario_responsavel
        FROM log_auditoria la
        WHERE la.tabela = 'campanha'
          AND la.identidade_registro = c.id_campanha::text
          AND la.dados_novos ->> 'status' = c.status::text
        ORDER BY la.id_log DESC
        LIMIT 1
      ) l ON TRUE
      LEFT JOIN usuario u ON u.id_usuario = l.id_usuario_responsavel
      WHERE c.id_campanha = ${resposta.idCampanha} AND c.encerrado_em IS NOT NULL
    `.execute(this.database.getDb());
    resposta.nomeEncerrador = resultado.rows[0]?.nome ?? null;
  }

  // RF-087. A conta é a do repasse (liquido_repasse, 05 [05-K-2]): mesma taxa mínima, então a estimativa nunca
  // promete mais do que o repasse vai pagar.
  private async preencherLiquidoEstimado(
    resposta: CampanhaResponse,
  ): Promise<void> {
    const resultado = await sql<{ liquido: string; taxa: string }>`
      SELECT public.liquido_repasse(c.valor_bruto_arrecadado,
               ROUND(c.valor_bruto_arrecadado * (1 - t.taxa / 100), 2)) AS liquido,
             t.taxa
      FROM campanha c
      CROSS JOIN LATERAL (SELECT COALESCE(c.taxa_plataforma, public.config_numero('taxa_plataforma_padrao', 5)) AS taxa) t
      WHERE c.id_campanha = ${resposta.idCampanha}
    `.execute(this.database.getDb());
    const linha = resultado.rows[0] as
      { liquido: string; taxa: string } | undefined;
    if (linha) {
      resposta.valorLiquidoEstimado = Number(linha.liquido);
      resposta.taxaAplicada = Number(linha.taxa);
    }
  }

  // Lista de campos que o banco trava agora: a MESMA função que a trigger de congelamento usa (05, [05-K-2-D]),
  // então a tela trava exatamente o que o banco vai recusar, sem repetir a regra no React nem aqui.
  private async preencherCamposBloqueados(
    resposta: CampanhaResponse,
  ): Promise<void> {
    const resultado = await sql<{ campos: string[] }>`
      SELECT public.fn_campanha_campos_bloqueados(c) AS campos
      FROM campanha c WHERE c.id_campanha = ${resposta.idCampanha}
    `.execute(this.database.getDb());
    resposta.camposBloqueados = (resultado.rows[0]?.campos ?? []).map(
      (campo) => CAMPO_BLOQUEADO_PARA_DTO[campo] ?? campo,
    );
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
