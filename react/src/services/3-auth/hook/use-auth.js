import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../constant/constants/api.constants';
import * as authApi from '../api/auth.api';

const CHAVE_REFRESH_TOKEN = 'crowdacademico.devtools.refreshToken';

// Hook único de autenticação da tela de devtools (views/dev). Guarda o
// accessToken só em memória (nunca localStorage — some ao fechar a aba, de
// propósito) e o refreshToken em localStorage (pra não precisar logar nas
// vezes que ficar recarregando a página testando). Nada disso é o desenho
// final de auth do site de verdade — isto é só a ferramenta interna pra
// provar CRUD + RLS funcionando (ver Probleminha-chan.md / relatório desta
// rodada).
export function useAuth() {
  const [accessToken, setAccessToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const refreshTokenRef = useRef(localStorage.getItem(CHAVE_REFRESH_TOKEN));

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
  // refresh token e repete a chamada original. Isso é o que a tela de
  // devtools usa pra todo CRUD — nunca fetch() cru direto.
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
          const renovado = await authApi.refresh(refreshTokenRef.current);
          salvarSessao(renovado);
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
    [accessToken, salvarSessao, limparSessao],
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
