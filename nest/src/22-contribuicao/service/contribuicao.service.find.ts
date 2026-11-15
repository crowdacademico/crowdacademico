import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../commons/database/database.constants';
import { executarTransacaoCurta } from '../../commons/database/transacao-curta.util';
import type { UsuarioAutenticado } from '../../commons/auth/usuario-autenticado.interface';
import { ContribuicaoResponseFind } from '../dto/response/contribuicao.response-find';

interface LinhaContribuicao {
  id_contribuicao: number;
  id_campanha: number;
  valor: string;
  meio_pagamento: string;
  status: string;
  criado_em: Date;
  termo_versao: string | null;
  termo_aceito_em: Date | null;
}

// GET /contribuicao/:id. Quem contribuiu COM conta consulta pelo login; quem contribuiu SEM conta, pelo tokenSessao que
// recebeu ao contribuir (header X-Token-Sessao), nunca pelo id sequencial sozinho: é o que impede enumerar contribuições
// de terceiros. Quem decide quem enxerga o quê é a RLS (pol_contribuicao_select / pol_contribuicao_anon_select, 04): o
// service só monta a sessão e consulta. Contribuição que não existe e contribuição de outra pessoa dão a MESMA resposta
// (404), sem revelar existência. `PG_POOL` + transação curta porque a rota é @SemTransacaoGlobal() (pública, sem login
// obrigatório: o interceptor global não monta a sessão do token).
@Injectable()
export class ContribuicaoServiceFind {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async executar(
    idContribuicao: number,
    usuario: UsuarioAutenticado | undefined,
    tokenSessao: string | undefined,
  ): Promise<ContribuicaoResponseFind> {
    const linha = await executarTransacaoCurta<LinhaContribuicao | undefined>(
      this.pool,
      { idUsuario: usuario?.idUsuario, tokenSessao },
      async (client) => {
        const resultado = await client.query<LinhaContribuicao>(
          `SELECT c.id_contribuicao, c.id_campanha, c.valor, c.meio_pagamento, c.status, c.criado_em,
                  t.versao AS termo_versao, a.aceito_em AS termo_aceito_em
           FROM contribuicao c
           LEFT JOIN aceite_termo_contribuicao a ON a.id_contribuicao = c.id_contribuicao
           LEFT JOIN termos_de_uso t ON t.id_termo = a.id_termo
           WHERE c.id_contribuicao = $1`,
          [idContribuicao],
        );
        return resultado.rows[0];
      },
    );
    if (!linha) {
      throw new NotFoundException('Contribuição não encontrada.');
    }
    return {
      idContribuicao: linha.id_contribuicao,
      idCampanha: linha.id_campanha,
      valor: Number(linha.valor),
      meioPagamento: linha.meio_pagamento,
      status: linha.status,
      criadoEm: linha.criado_em,
      termoAceito:
        linha.termo_versao && linha.termo_aceito_em
          ? { versao: linha.termo_versao, aceitoEm: linha.termo_aceito_em }
          : null,
    };
  }
}
