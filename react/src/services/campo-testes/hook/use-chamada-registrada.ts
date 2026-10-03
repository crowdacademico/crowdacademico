// Campo de Testes é parte permanente do painel administrativo (não uma ferramenta de teste descartável), com o
// mesmo padrão de dados/comportamento do resto do sistema (nunca uma versão simplificada à parte).

import { useCallback } from 'react';
import { tratarResposta } from '../../constant/api/http.util';
import { useCampoTestes } from './use-campo-testes';
import type { UseAuthReturn } from '../../3-auth/hook/use-auth';
import type { AuthFetch } from '../../3-auth/type/auth.type';

// Um `authFetch` de verdade (a sessão real do painel) que também registra cada chamada no Registro de
// Chamadas: método, caminho, status, tempo e os dois corpos. Com o mesmo formato de `auth.authFetch`, dá para
// entregá-lo a qualquer componente ou API compartilhada (ex.: o painel de orçamento/cronograma, que também vive
// fora do Campo de Testes) sem esse componente saber que o registro existe.
export function useAuthFetchRegistrado(auth: Pick<UseAuthReturn, 'authFetch'>): AuthFetch {
  const { registrarChamada } = useCampoTestes();

  return useCallback(
    async (caminho: string, opcoes: RequestInit = {}): Promise<Response> => {
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
        // `opcoes.body` é tipado como BodyInit (Blob/FormData/etc. também são válidos ali, mesmo esta app
        // SEMPRE mandando `JSON.stringify(...)`, nunca um desses outros formatos): `String()` num Blob/FormData
        // não dá o JSON de volta, dá "[object Blob]" (`no-base-to-string`). Só tenta interpretar quando já é
        // string de verdade; outro formato de corpo vira `null` aqui (nunca aconteceu até hoje, mas ser honesto
        // é melhor que dado enganoso no registro).
        corpoEnviado: typeof opcoes.body === 'string' ? JSON.parse(opcoes.body) : null,
        corpoRecebido,
        ok: respostaFetch.ok,
      });

      return respostaFetch;
    },
    [auth, registrarChamada],
  );
}

// O mesmo, já devolvendo o corpo tratado (`tratarResposta<T>`): `chamarERegistrar<AlgumaResponse>(...)`.
export function useChamadaRegistrada(auth: Pick<UseAuthReturn, 'authFetch'>) {
  const authFetchRegistrado = useAuthFetchRegistrado(auth);

  return useCallback(
    async <T,>(caminho: string, opcoes: RequestInit = {}): Promise<T> =>
      tratarResposta<T>(await authFetchRegistrado(caminho, opcoes)),
    [authFetchRegistrado],
  );
}
