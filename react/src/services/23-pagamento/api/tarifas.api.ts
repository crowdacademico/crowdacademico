import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';

// O resultado de POST /pagamento/tarifas/sincronizar (nest/src/23-pagamento/service/pagamento.service.sync-fees.ts).
export interface ResultadoSincronizacaoTarifas {
  provedor: string;
  // false = o provedor não informa tarifas (o de teste): nada mudou.
  sincronizado: boolean;
  alterados: number;
  tarifas: { pix: number; boleto: number; cartaoPercentual: number; cartaoFixa: number } | null;
}

export const tarifasApi = {
  // Lê as tarifas de hoje no provedor e grava nos parâmetros (exige configuracao_gerenciar). A tarefa diária faz o mesmo às 5h.
  sincronizar: (authFetch: AuthFetch): Promise<ResultadoSincronizacaoTarifas> =>
    authFetch('/pagamento/tarifas/sincronizar', { method: 'POST' }).then(tratarResposta<ResultadoSincronizacaoTarifas>),
};
