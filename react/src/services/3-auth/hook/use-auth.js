import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../constant/constants/api.constants';
import * as authApi from '../api/auth.api';

const CHAVE_REFRESH_TOKEN = 'crowdacademico.refreshToken';

// Hook único de autenticação do painel admin (views/admin, views/3-auth,
// views/1-usuario) — useAuth() é chamado uma vez em App.jsx e o resultado
// desce por prop pra Header, Breadcrumb (indiretamente) e cada página.
// Guarda o accessToken só em memória (nunca localStorage — some ao fechar
// a aba, de propósito) e o refreshToken em localStorage (pra não precisar
// logar de novo a cada F5).
export function useAuth() {
  const [accessToken, setAccessToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const refreshTokenRef = useRef(localStorage.getItem(CHAVE_REFRESH_TOKEN));
  // Promise compartilhada entre chamadas simultâneas de authFetch — ver
  // renovarSessao() logo abaixo.
  const refreshEmAndamentoRef = useRef(null);

  const salvarSessao = useCallback((resultado) => {
    setAccessToken(resultado.accessToken);
    refreshTokenRef.current = resultado.refreshToken;
    localStorage.setItem(CHAVE_REFRESH_TOKEN, resultado.refreshToken);
    if (resultado.usuario) {
      setUsuario(resultado.usuario);
    }
  }, []);

  const limparSessao = useCallback(() => {
    setAccessToken(null);
    setUsuario(null);
    refreshTokenRef.current = null;
    localStorage.removeItem(CHAVE_REFRESH_TOKEN);
  }, []);

  // Ao carregar a página: se sobrou um refresh token de uma visita
  // anterior, tenta renovar em silêncio (senão sempre voltaria pra tela de
  // login, mesmo com sessão ainda válida).
  useEffect(() => {
    const tokenSalvo = refreshTokenRef.current;
    if (!tokenSalvo) {
      setCarregando(false);
      return;
    }
    authApi
      .refresh(tokenSalvo)
      .then((resultado) => salvarSessao(resultado))
      .catch(() => limparSessao())
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, senha) => {
      const resultado = await authApi.login(email, senha);
      salvarSessao(resultado);
      return resultado;
    },
    [salvarSessao],
  );

  // ACHADO (07-08-2026, o Lucas viu "token de acesso inválido" 3x seguidas
  // ao voltar de um tempo parado): o token de acesso expirado + uma tela
  // que dispara várias requisições de uma vez (ex.: Alterar Usuário, que
  // busca usuário + papéis + catálogo em paralelo) fazia CADA requisição
  // tentar renovar por conta própria, ao mesmo tempo. Renovar é de
  // USO ÚNICO (auth.service.refresh.ts revoga a sessão antiga ao emitir a
  // nova) — a 1ª chamada a chegar no backend ganha, as outras recebem
  // "refresh token inválido" de volta (a sessão já tinha sido trocada) e
  // cada uma disparava seu próprio toast de erro.
  //
  // Fix: só existe UMA renovação em voo por vez — se uma já está
  // acontecendo, quem chegar depois espera o resultado dela em vez de
  // começar a sua própria (que perderia a corrida). refreshEmAndamentoRef
  // guarda essa promise única; zera no final (sucesso ou falha), pra
  // liberar a PRÓXIMA vez que o token expirar de verdade.
  const renovarSessao = useCallback(() => {
    if (!refreshEmAndamentoRef.current) {
      refreshEmAndamentoRef.current = authApi
        .refresh(refreshTokenRef.current)
        .then((resultado) => {
          salvarSessao(resultado);
          return resultado;
        })
        .finally(() => {
          refreshEmAndamentoRef.current = null;
        });
    }
    return refreshEmAndamentoRef.current;
  }, [salvarSessao]);

  const logout = useCallback(async () => {
    const tokenAtual = refreshTokenRef.current;
    limparSessao();
    if (tokenAtual) {
      await authApi.logout(tokenAtual).catch(() => {
        // Já limpamos localmente — sessão do lado do backend pode ficar
        // pendente até expirar sozinha (30 dias), não é crítico pra um devtool.
      });
    }
  }, [limparSessao]);

  // authFetch: SEMPRE manda Bearer quando tem accessToken. Se a resposta vier
  // 401 (access token expirado — dura só 15min), tenta renovar UMA vez com o
  // refresh token e repete a chamada original. Isso é o que todo o painel
  // admin usa pra falar com a API — nunca fetch() cru direto.
  const authFetch = useCallback(
    async (caminho, opcoes = {}) => {
      const montarHeaders = (token) => ({
        'Content-Type': 'application/json',
        ...(opcoes.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      });

      let resposta = await fetch(`${API_BASE_URL}${caminho}`, {
        ...opcoes,
        headers: montarHeaders(accessToken),
      });

      if (resposta.status === 401 && refreshTokenRef.current) {
        try {
          const renovado = await renovarSessao();
          resposta = await fetch(`${API_BASE_URL}${caminho}`, {
            ...opcoes,
            headers: montarHeaders(renovado.accessToken),
          });
        } catch {
          limparSessao();
        }
      }

      return resposta;
    },
    [accessToken, renovarSessao, limparSessao],
  );

  return {
    accessToken,
    usuario,
    carregando,
    autenticado: accessToken !== null,
    login,
    logout,
    authFetch,
  };
}
