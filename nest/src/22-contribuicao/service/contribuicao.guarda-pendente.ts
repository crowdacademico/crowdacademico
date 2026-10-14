import { GoneException } from '@nestjs/common';
import { Pool } from 'pg';
import {
  executarTransacaoCurta,
  type SessaoTransacaoCurta,
} from '../../commons/database/transacao-curta.util';
import { MENSAGEM_CONTRIBUICAO_INDISPONIVEL } from '../constants/contribuicao.constants';

// Guarda de "ainda dá para cobrar": ANTES de qualquer chamada que gere cobrança no gateway, confirma numa transação
// curta que a contribuição continua 'pendente'. Se o cron a expirou ou ela foi marcada com erro, gerar um QR/cobrança
// seria receber dinheiro que não pode ser contabilizado (contribuição expirada não volta a confirmar): responde
// 410 Gone e NÃO chama o gateway.
//
// Reutilizável de propósito: o POST /contribuicao a usa entre o passo 1 e o gateway, e qualquer rota futura que gere ou
// regenere cobrança para uma contribuição JÁ existente (ex.: "gerar novo PIX") deve chamá-la antes de falar com o
// gateway. Contribuição que a RLS esconde é tratada como indisponível (mesma resposta, sem vazar existência).
export async function exigirContribuicaoPendente(
  pool: Pool,
  idContribuicao: number,
  sessao: SessaoTransacaoCurta,
): Promise<void> {
  const status = await executarTransacaoCurta(pool, sessao, async (client) => {
    const resultado = await client.query<{ status: string }>(
      'SELECT status FROM contribuicao WHERE id_contribuicao = $1',
      [idContribuicao],
    );
    return (resultado.rows[0] as { status: string } | undefined)?.status;
  });
  if (status !== 'pendente') {
    throw new GoneException(MENSAGEM_CONTRIBUICAO_INDISPONIVEL);
  }
}
