// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
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
        // `opcoes.body` é tipado como BodyInit (pode não ser string) - JSON.parse
        // já coagia isso implicitamente via ToString em JS puro; String(...)
        // só deixa essa coerção explícita pro TypeScript, mesmo resultado.
        corpoEnviado: opcoes.body ? JSON.parse(String(opcoes.body)) : null,
        corpoRecebido,
        ok: respostaFetch.ok,
      });

      return tratarResposta<T>(respostaFetch);
    },
    [auth, registrarChamada],
  );
}
