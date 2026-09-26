import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { API_BASE_URL } from '../../constant/constants/api.constants';
import * as authApi from '../api/auth.api';
import type { AuthFetch, AuthResponseLogin, AuthResponseRefresh, AuthResponseRegister } from '../type/auth.type';
import type { UsuarioResponse } from '../../1-usuario/type/usuario.type';

const CHAVE_REFRESH_TOKEN = 'crowdacademico.refreshToken';

export interface UseAuthReturn {
  accessToken: string | null;
  usuario: UsuarioResponse | null;
  papeis: string[];
  ehAdmin: boolean;
  carregando: boolean;
  autenticado: boolean;
  login: (email: string, senha: string) => Promise<AuthResponseLogin>;
  cadastrar: (
    nome: string,
    email: string,
    senha: string,
    aceiteTermos: boolean,
  ) => Promise<AuthResponseRegister>;
  logout: () => Promise<void>;
  authFetch: AuthFetch;
  atualizarUsuarioLocal: Dispatch<SetStateAction<UsuarioResponse | null>>;
}

// Hook único de autenticação do painel admin (views/admin, views/3-auth,
// views/1-usuario) - useAuth() é chamado uma vez em App.tsx e o resultado
// desce por prop pra Header, Breadcrumb (indiretamente) e cada página.
// Guarda o accessToken só em memória (nunca localStorage - some ao fechar
// a aba, de propósito) e o refreshToken em localStorage (pra não precisar
// logar de novo a cada F5).
export function useAuth(): UseAuthReturn {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioResponse | null>(null);
  // Nomes dos papéis da sessão atual: o dropdown do cabeçalho precisa saber se mostra "Painel Admin". Vem de
  // dentro de LoginResponseDto/RefreshResponseDto (nest/src/3-auth); não é uma checagem de permissão de
  // verdade, só decide o que aparece na UI; toda ação real continua validada pelo backend/RLS a cada
  // requisição.
  const [papeis, setPapeis] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const refreshTokenRef = useRef<string | null>(localStorage.getItem(CHAVE_REFRESH_TOKEN));
  // Promise compartilhada entre chamadas simultâneas de authFetch - ver
  // renovarSessao() logo abaixo.
  const refreshEmAndamentoRef = useRef<Promise<AuthResponseRefresh> | null>(null);
  // Espelho síncrono do accessToken: authFetch precisa saber se JÁ existe token no instante da chamada, mesmo que
  // quem chamou tenha vindo de uma renderização anterior à renovação (o estado `accessToken` ficaria defasado).
  const accessTokenRef = useRef<string | null>(null);
  // GETs em voo, por caminho - ver comentário em authFetch mais abaixo.
  const requisicoesEmAndamentoRef = useRef<Map<string, Promise<Response>>>(new Map());

  const salvarSessao = useCallback((resultado: AuthResponseLogin) => {
    setAccessToken(resultado.accessToken);
    accessTokenRef.current = resultado.accessToken;
    refreshTokenRef.current = resultado.refreshToken;
    localStorage.setItem(CHAVE_REFRESH_TOKEN, resultado.refreshToken);
    setUsuario(resultado.usuario);
    setPapeis(resultado.papeis);
  }, []);

  const limparSessao = useCallback(() => {
    setAccessToken(null);
    accessTokenRef.current = null;
    setUsuario(null);
    setPapeis([]);
    refreshTokenRef.current = null;
    localStorage.removeItem(CHAVE_REFRESH_TOKEN);
  }, []);

  const login = useCallback(
    async (email: string, senha: string): Promise<AuthResponseLogin> => {
      const resultado = await authApi.login(email, senha);
      salvarSessao(resultado);
      return resultado;
    },
    [salvarSessao],
  );

  // Cadastro público: mesmo formato de resultado do login (accessToken/refreshToken/usuario/papeis), termina já
  // logado.
  const cadastrar = useCallback(
    async (
      nome: string,
      email: string,
      senha: string,
      aceiteTermos: boolean,
    ): Promise<AuthResponseRegister> => {
      const resultado = await authApi.cadastro(nome, email, senha, aceiteTermos);
      salvarSessao(resultado);
      return resultado;
    },
    [salvarSessao],
  );

  // Um token de acesso expirado + uma tela que dispara várias requisições de uma vez (ex.: Alterar Usuário, que
  // busca usuário + papéis + catálogo em paralelo) faria CADA requisição tentar renovar por conta própria, ao
  // mesmo tempo. Renovar é de USO ÚNICO (auth.service.refresh.ts revoga a sessão antiga ao emitir a nova): a 1ª
  // chamada a chegar no backend ganha, as outras recebem "refresh token inválido" (a sessão já tinha sido
  // trocada) e cada uma dispararia seu próprio toast de erro.
  //
  // Por isso só existe UMA renovação em voo por vez: se uma já está acontecendo, quem chegar depois espera o
  // resultado dela em vez de começar a sua própria (que perderia a corrida). refreshEmAndamentoRef guarda essa
  // promise única; zera no final (sucesso ou falha), para liberar a PRÓXIMA vez que o token expirar de verdade.
  //
  // `refreshToken` vem por parâmetro (em vez de ler refreshTokenRef.current aqui dentro) para o TypeScript
  // conseguir provar, no ponto de CHAMADA, que o valor não é nulo: dentro desta função o ref já teria voltado a
  // ser `string | null` de qualquer forma.
  const renovarSessao = useCallback(
    (refreshToken: string): Promise<AuthResponseRefresh> => {
      if (!refreshEmAndamentoRef.current) {
        refreshEmAndamentoRef.current = authApi
          .refresh(refreshToken)
          .then((resultado) => {
            salvarSessao(resultado);
            return resultado;
          })
          .finally(() => {
            refreshEmAndamentoRef.current = null;
          });
      }
      return refreshEmAndamentoRef.current;
    },
    [salvarSessao],
  );

  // Ao carregar a página: se sobrou um refresh token de uma visita anterior, tenta renovar em silêncio (senão
  // sempre voltaria para a tela de login, mesmo com sessão ainda válida).
  //
  // Chama renovarSessao() (a MESMA promise compartilhada), não authApi.refresh(tokenSalvo) direto: fora da
  // proteção descrita em renovarSessao, se alguma tela disparasse um GET no mesmo instante (accessToken ainda
  // null, então authFetch levaria 401 e também tentaria renovar), as DUAS chamadas usariam o MESMO refresh
  // token (uso único: renovar revoga o antigo). Quem perdesse a corrida receberia "refresh token inválido" e,
  // como este efeito tratava qualquer erro com limparSessao() incondicional, ele podia apagar a sessão que a
  // OUTRA chamada, vencedora, tinha acabado de salvar: um F5/link direto que deveria continuar logado às vezes
  // voltava para a tela de login sem motivo aparente. Assim só existe UMA renovação de verdade nesta janela,
  // não importa quantos lugares a peçam ao mesmo tempo.
  useEffect(() => {
    const refreshToken = refreshTokenRef.current;
    if (!refreshToken) {
      setCarregando(false);
      return;
    }
    renovarSessao(refreshToken)
      .catch(() => limparSessao())
      .finally(() => setCarregando(false));
  }, [renovarSessao, limparSessao]);

  const logout = useCallback(async (): Promise<void> => {
    const tokenAtual = refreshTokenRef.current;
    limparSessao();
    if (tokenAtual) {
      await authApi.logout(tokenAtual).catch(() => {
        // Já limpamos localmente - sessão do lado do backend pode ficar
        // pendente até expirar sozinha (30 dias), não é crítico pra um devtool.
      });
    }
  }, [limparSessao]);

  // authFetch: SEMPRE manda Bearer quando tem accessToken. Se a resposta vier
  // 401 (access token expirado - dura só 15min), tenta renovar UMA vez com o
  // refresh token e repete a chamada original. Isso é o que todo o painel
  // admin usa pra falar com a API - nunca fetch() cru direto.
  const executarFetch = useCallback(
    async (caminho: string, opcoes: RequestInit): Promise<Response> => {
      // `opcoes.headers` chega tipado como HeadersInit (Headers | Record<
      // string, string> | [string, string][] | undefined) - usar a própria
      // API Headers pra montar o resultado evita precisar de `as` só pra
      // conseguir espalhar um objeto de tipo desconhecido. Nenhum chamador
      // real passa headers hoje (conferido: nenhum X.api.ts manda `headers`
      // pra authFetch), então o resultado é idêntico ao merge manual
      // anterior em todo caso que já existe.
      const montarHeaders = (token: string | null): Headers => {
        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        new Headers(opcoes.headers).forEach((valor, chave) => headers.set(chave, valor));
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return headers;
      };

      // F5 com sessão salva: o token de acesso só existe depois da renovação inicial. Chamar a API antes disso
      // dava 401 no console e uma segunda renovação; esperar a mesma renovação (promise compartilhada) evita os dois.
      let tokenInicial = accessTokenRef.current;
      const refreshInicial = refreshTokenRef.current;
      if (!tokenInicial && refreshInicial) {
        try {
          tokenInicial = (await renovarSessao(refreshInicial)).accessToken;
        } catch {
          limparSessao();
        }
      }

      let resposta = await fetch(`${API_BASE_URL}${caminho}`, {
        ...opcoes,
        headers: montarHeaders(tokenInicial),
      });

      const refreshToken = refreshTokenRef.current;
      if (resposta.status === 401 && refreshToken) {
        try {
          const renovado = await renovarSessao(refreshToken);
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
    [renovarSessao, limparSessao],
  );

  const authFetch = useCallback(
    (caminho: string, opcoes: RequestInit = {}): Promise<Response> => {
      const metodo = (opcoes.method ?? 'GET').toUpperCase();

      // DEDUP DE GET EM VOO: o <StrictMode> do React (main.tsx) dispara todo useEffect 2 vezes DE PROPÓSITO em
      // desenvolvimento, para pegar bug de efeito sem limpeza, e nenhuma das nossas buscas cancela a anterior:
      // toda tela que busca dado ao abrir (a maioria: listagem, log, consultar) viraria 2 requisições reais
      // para o servidor e, se falhasse, 2 toasts ("Você precisa estar logado" aparecendo 2x).
      //
      // Só GET é deduplicado (create/update/remove nunca são, de propósito: são sempre 1 clique = 1 ação, nunca
      // disparados por useEffect). Duas chamadas para o MESMO caminho ao mesmo tempo dividem a mesma resposta
      // em vez de virarem 2 idas ao servidor; `.clone()` porque o corpo de um Response só pode ser lido uma
      // vez, e cada quem pediu precisa da própria cópia para poder chamar `.json()`/`.text()` sem pisar no
      // outro.
      if (metodo !== 'GET') {
        return executarFetch(caminho, opcoes);
      }

      let promessa = requisicoesEmAndamentoRef.current.get(caminho);
      if (!promessa) {
        promessa = executarFetch(caminho, opcoes);
        requisicoesEmAndamentoRef.current.set(caminho, promessa);
        void promessa.finally(() => {
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
    // Minha Conta usa isto depois de PATCH /usuario/:id com o próprio id: atualiza o nome/etc mostrado no
    // cabeçalho na hora, sem precisar de um refresh de token só para refletir a mudança.
    atualizarUsuarioLocal: setUsuario,
  };
}
