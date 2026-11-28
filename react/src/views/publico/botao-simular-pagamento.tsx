import { useState } from 'react';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import { contribuicaoPublicaApi } from '../../services/22-contribuicao/api/contribuicao-publica.api';

interface BotaoSimularPagamentoProps {
  authFetch: AuthFetch;
  idContribuicao: number;
  tokenSessao: string;
  // Chamado uns segundos depois do pedido aceito, para a tela consultar a situação sem esperar a próxima rodada.
  aoSimular: () => void;
}

// Tempo para o aviso (webhook) do Asaas chegar ao Nest antes de a tela consultar de novo.
const ESPERA_WEBHOOK_MS = 4_000;

// SÓ DESENVOLVIMENTO (25-11-2026, Lucas): paga o Pix de mentira sem abrir o painel do Asaas. Aparece só quando o Nest
// manda pix.podeSimularPagamento, o que exige ASAAS_SIMULAR_PAGAMENTO=true no nest/.env local; o Render não tem essa
// variável (decisão do orientador, 28-11-2026). Quem confirma a contribuição continua sendo o webhook.
export function BotaoSimularPagamento({ authFetch, idContribuicao, tokenSessao, aoSimular }: BotaoSimularPagamentoProps) {
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const simular = async () => {
    setEnviando(true);
    setErro(null);
    try {
      await contribuicaoPublicaApi.simularPagamento(authFetch, idContribuicao, tokenSessao);
      setPedido(true);
      window.setTimeout(aoSimular, ESPERA_WEBHOOK_MS);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível simular o pagamento.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="w-full fundo-info texto-info rounded-lg p-3 text-left">
      <p className="legenda mb-2">Ambiente de testes (sandbox do Asaas): nenhum dinheiro de verdade.</p>
      <button type="button" onClick={() => void simular()} disabled={enviando || pedido} className="btn btn-secondary w-full">
        {enviando ? 'Simulando...' : pedido ? 'Pagamento simulado. Aguardando o aviso do Asaas...' : 'Simular pagamento'}
      </button>
      {erro && <p className="legenda texto-erro mt-1">{erro}</p>}
    </div>
  );
}
