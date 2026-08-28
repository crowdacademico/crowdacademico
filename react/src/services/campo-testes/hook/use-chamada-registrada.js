// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useCallback } from 'react';
import { tratarResposta } from '../../constant/api/http.util';
import { useCampoTestes } from './use-campo-testes';

// Equivalente do antigo `elenco.fetchComoAtor()`, sem o "ator": chama
// `auth.authFetch()` de verdade (a sessão real do painel) e só acrescenta
// cronometragem + registro pra T4 (Registro de Chamadas) continuar
// funcionando. Devolve o corpo já tratado (`tratarResposta`), mesmo
// contrato de antes — quem chama não precisa mudar como lê o resultado.
export function useChamadaRegistrada(auth) {
  const { registrarChamada } = useCampoTestes();

  return useCallback(
    async (caminho, opcoes = {}) => {
      const metodo = (opcoes.method ?? 'GET').toUpperCase();
      const inicio = performance.now();
      const respostaFetch = await auth.authFetch(caminho, opcoes);
      const ms = Math.round(performance.now() - inicio);

      let corpoRecebido = null;
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
        corpoEnviado: opcoes.body ? JSON.parse(opcoes.body) : null,
        corpoRecebido,
        ok: respostaFetch.ok,
      });

      return tratarResposta(respostaFetch);
    },
    [auth, registrarChamada],
  );
}
