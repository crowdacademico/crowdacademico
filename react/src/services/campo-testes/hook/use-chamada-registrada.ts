// ============================================================================
// Campo de Testes deixou de ser só ferramenta de teste descartável
// (07-09-2026, decisão do Lucas): virou parte permanente do painel
// administrativo, com o mesmo padrão de dados/comportamento do resto do
// sistema (nunca uma versão simplificada à parte).
// ============================================================================

import { useCallback } from 'react';
import { tratarResposta } from '../../constant/api/http.util';
import { useCampoTestes } from './use-campo-testes';
import type { UseAuthReturn } from '../../3-auth/hook/use-auth';

// Equivalente do antigo `elenco.fetchComoAtor()`, sem o "ator": chama
// `auth.authFetch()` de verdade (a sessão real do painel) e só acrescenta
// cronometragem + registro pra T4 (Registro de Chamadas) continuar
// funcionando. Devolve o corpo já tratado (`tratarResposta<T>`), mesmo
// contrato de antes - quem chama não precisa mudar como lê o resultado, só
// passa o tipo esperado (`chamarERegistrar<AlgumaResponse>(...)`).
export function useChamadaRegistrada(auth: Pick<UseAuthReturn, 'authFetch'>) {
  const { registrarChamada } = useCampoTestes();

  return useCallback(
    async <T,>(caminho: string, opcoes: RequestInit = {}): Promise<T> => {
      const metodo = (opcoes.method ?? 'GET').toUpperCase();
      const inicio = performance.now();
      const respostaFetch = await auth.authFetch(caminho, opcoes);
      const ms = Math.round(performance.now() - inicio);

      let corpoRecebido: unknown = null;
      try {
        const texto = await respostaFetch.clone().text();
        corpoRecebido = texto ? JSON.parse(texto) : null;
      } catch {
        // mantém null, corpo não era JSON (raro, ex.: 204 sem corpo)
      }

      registrarChamada({
        metodo,
        caminho,
        status: respostaFetch.status,
        ms,
        // `opcoes.body` é tipado como BodyInit (Blob/FormData/etc. também
        // são válidos ali, mesmo esta app SEMPRE mandando `JSON.stringify(...)`
        // - nunca um desses outros formatos) - `String()` num Blob/FormData
        // não dá o JSON de volta, dá "[object Blob]" (achado 08-09-2026,
        // `no-base-to-string`). Só tenta interpretar quando já é string de
        // verdade; outro formato de corpo vira `null` aqui (nunca aconteceu
        // até hoje, mas full-honesto é melhor que dado enganoso no T4).
        corpoEnviado: typeof opcoes.body === 'string' ? JSON.parse(opcoes.body) : null,
        corpoRecebido,
        ok: respostaFetch.ok,
      });

      return tratarResposta<T>(respostaFetch);
    },
    [auth, registrarChamada],
  );
}
