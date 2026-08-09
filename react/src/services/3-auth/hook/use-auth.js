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
  // Nomes dos papéis da sessão atual (09-08-2026, Bloco B/C: dropdown do
  // cabeçalho precisa saber se mostra "Painel Admin"). Vem de dentro de
  // LoginResponseDto/RefreshResponseDto agora (nest/src/3-auth) — não é
  // uma checagem de permissão de verdade, só decide o que aparece na UI;
  // toda ação real continua validada pelo backend/RLS a cada requisição.
  const [papeis, setPapeis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const refreshTokenRef = useRef(localStorage.getItem(CHAVE_REFRESH_TOKEN));
  // Promise compartilhada entre chamadas simultâneas de authFetch — ver
  // renovarSessao() logo abaixo.
  const refreshEmAndamentoRef = useRef(null);
  // GETs em voo, por caminho — ver comentário em authFetch mais abaixo.
  const requisicoesEmAndamentoRef = useRef(new Map());

  const salvarSessao = useCallback((resultado) => {
    setAccessToken(resultado.accessToken);
    refreshTokenRef.current = resultado.refreshToken;
    localStorage.setItem(CHAVE_REFRESH_TOKEN, resultado.refreshToken);
    if (resultado.usuario) {
      setUsuario(resultado.usuario);
    }
    if (resultado.papeis) {
      setPapeis(resultado.papeis);
    }
  }, []);

  const limparSessao = useCallback(() => {
    setAccessToken(null);
    setUsuario(null);
    setPapeis([]);
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

  // Cadastro público (09-08-2026, Bloco D) — mesmo formato de resultado do
  // login (accessToken/refreshToken/usuario/papeis), termina já logado.
  const cadastrar = useCallback(
    async (nome, email, senha, aceiteTermos) => {
      const resultado = await authApi.cadastro(nome, email, senha, aceiteTermos);
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
  const executarFetch = useCallback(
    async (caminho, opcoes) => {
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

  const authFetch = useCallback(
    (caminho, opcoes = {}) => {
      const metodo = (opcoes.method ?? 'GET').toUpperCase();

      // DEDUP DE GET EM VOO (07-08-2026, achado do Lucas: toast de erro
      // duplicado — "Você precisa estar logado" aparecendo 2x). Causa: o
      // <StrictMode> do React (main.jsx) dispara todo useEffect 2 vezes DE
      // PROPÓSITO em desenvolvimento, pra pegar bug de efeito sem limpeza —
      // e nenhuma das nossas buscas cancelava a anterior. Resultado: toda
      // tela que busca dado ao abrir (a maioria — listagem, log, consultar)
      // virava 2 requisições reais pro servidor; se falhava, 2 toasts.
      //
      // Só GET é deduplicado (create/update/remove nunca são, de propósito —
      // aqueles são sempre 1 clique = 1 ação, nunca disparados por
      // useEffect). Duas chamadas pro MESMO caminho ao mesmo tempo dividem
      // a mesma resposta em vez de virarem 2 idas ao servidor — `.clone()`
      // porque o corpo de um Response só pode ser lido uma vez; cada quem
      // pediu precisa da própria cópia pra poder chamar `.json()`/`.text()`
      // sem pisar no outro.
      if (metodo !== 'GET') {
        return executarFetch(caminho, opcoes);
      }

      let promessa = requisicoesEmAndamentoRef.current.get(caminho);
      if (!promessa) {
        promessa = executarFetch(caminho, opcoes);
        requisicoesEmAndamentoRef.current.set(caminho, promessa);
        promessa.finally(() => {
          requisicoesEmAndamentoRef.current.delete(caminho);
        });
      }
      return promessa.then((resposta) => resposta.clone());
    },
    [executarFetch],
  );

  return {
    accessToken,
    usuario,
    papeis,
    ehAdmin: papeis.includes('admin'),
    carregando,
    autenticado: accessToken !== null,
    login,
    cadastrar,
    logout,
    authFetch,
    // Minha Conta (09-08-2026, Bloco E) usa isto depois de PATCH /usuario/:id
    // com o próprio id — atualiza o nome/etc mostrado no cabeçalho na hora,
    // sem precisar de um refresh de token só pra refletir a mudança.
    atualizarUsuarioLocal: setUsuario,
  };
}
