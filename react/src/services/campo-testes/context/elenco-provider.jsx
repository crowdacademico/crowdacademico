// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../../constant/constants/api.constants';
import { ErroHttp, tratarResposta } from '../../constant/api/http.util';
import { ElencoContext } from './elenco-context';

const CHAVE_SESSION_STORAGE = 'campoDeTestes.elenco';
const DURACAO_ACCESS_TOKEN_MS = 15 * 60 * 1000;
const LIMITE_REGISTRO_CHAMADAS = 200;
// Todo usuário do seed (07_seed_dados.sql) compartilha esta senha, nunca
// usada em produção. Não é "persona fake": é só o dado necessário pra
// logar como uma conta REAL já existente no banco, sem precisar
// descobrir a senha de cada uma na mão.
const SENHA_SEED_DEV = 'DevTcc123!';

function estadoInicialAtor() {
  return {
    status: 'entrando', // 'entrando' | 'vivo' | 'erro'
    usuario: null,
    papeis: [],
    expiraEm: null,
    erro: null,
    temPerfilPesquisador: null, // null = ainda não checado
  };
}

function lerSessionStorage() {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSION_STORAGE);
    return bruto ? JSON.parse(bruto) : {};
  } catch {
    return {};
  }
}

function gravarSessionStorage(refreshTokensPorId) {
  try {
    sessionStorage.setItem(CHAVE_SESSION_STORAGE, JSON.stringify(refreshTokensPorId));
  } catch {
    // Ambiente sem sessionStorage (raro): Elenco continua funcionando na
    // aba atual, só não sobrevive a um F5. Não é crítico pra devtool.
  }
}

// Provider central do Campo de Testes, mantém VÁRIAS sessões reais e
// independentes vivas ao mesmo tempo (uma por conta REAL do sistema),
// nunca mexendo na sessão real do painel (useAuth, App.jsx). Cada ator
// tem seu próprio accessToken (só em memória, num ref) e seu próprio
// refreshToken (sessionStorage, chave PRÓPRIA, nunca a
// 'crowdacademico.refreshToken' da sessão real, nunca localStorage).
//
// ERA um roster fixo de personas (services/campo-testes/constants/
// atores-seed.js, apagado em 23-08-2026, pedido do Lucas: "dados falsos
// que só sujam o código". Os testes já podiam usar QUALQUER conta real
// do seed, todas compartilham a mesma senha de dev; o roster era uma
// restrição artificial, não uma necessidade). Agora a chave de cada ator
// é o `idUsuario` de verdade: sem isso, o Elenco não sabia de nada além
// do que o roster descrevia; agora ele reflete exatamente quem está
// logado, e o nome/e-mail exibido vem direto da resposta do próprio
// login/refresh, nunca de uma lista escrita à mão.
//
// fetchComoAtor() é o equivalente do authFetch() de use-auth.js, mas com
// um detalhe crítico: o dedup de GET em voo do authFetch é chaveado só
// pelo CAMINHO, ignorando qual sessão pediu. Reusar aquele padrão aqui
// faria duas requisições simultâneas de atores diferentes pro MESMO
// endpoint devolverem a MESMA resposta (a de quem chegou primeiro). Aqui
// o mapa de requisições em voo é chaveado por `idUsuario:caminho`,
// isolando um ator do outro por completo.
//
// A ordem das funções abaixo importa (React Compiler não deixa uma
// função memoizada referenciar outra `const` declarada DEPOIS dela no
// corpo do componente): cada uma só usa o que já foi declarado acima.
export function ElencoProvider({ children }) {
  const [atores, setAtores] = useState({}); // { [idUsuario]: estado }, nasce vazio, sem roster nenhum
  const [registroChamadas, setRegistroChamadas] = useState([]);
  // "Agindo como" (Barra do Elenco): idUsuario do ator padrão pras
  // telas do Campo de Testes, compartilhada entre elas (não é estado de
  // UMA tela, é do provider). Trocar numa tela e navegar pra outra
  // mantém a escolha.
  const [atorPadrao, setAtorPadrao] = useState(null);
  // Mesma ideia, pro lado da campanha (23-08-2026, pedido do Lucas):
  // escolhida uma vez na Bancada da Campanha (T2), a Vida da Campanha
  // Ativa (T3) só usa essa mesma campanha, sem precisar escolher de novo.
  const [campanhaFoco, setCampanhaFoco] = useState(null);

  const tokensRef = useRef({}); // { [idUsuario]: { accessToken, refreshToken } }
  const requisicoesEmVooRef = useRef(new Map()); // chave: `${idUsuario}:${caminho}`
  const renovacaoEmVooRef = useRef({}); // { [idUsuario]: Promise }, 1 renovação por vez por ator

  const atualizarAtor = useCallback((idUsuario, parcial) => {
    setAtores((atuais) => ({ ...atuais, [idUsuario]: { ...atuais[idUsuario], ...parcial } }));
  }, []);

  const registrarChamada = useCallback((entrada) => {
    setRegistroChamadas((atual) => {
      const proxima = [{ id: crypto.randomUUID(), hora: new Date(), ...entrada }, ...atual];
      return proxima.slice(0, LIMITE_REGISTRO_CHAMADAS);
    });
  }, []);

  const salvarSessaoAtor = useCallback(
    (idUsuario, resultado) => {
      tokensRef.current[idUsuario] = {
        accessToken: resultado.accessToken,
        refreshToken: resultado.refreshToken,
      };
      const persistido = lerSessionStorage();
      persistido[idUsuario] = resultado.refreshToken;
      gravarSessionStorage(persistido);
      atualizarAtor(idUsuario, {
        status: 'vivo',
        usuario: resultado.usuario ?? null,
        papeis: resultado.papeis ?? [],
        expiraEm: Date.now() + DURACAO_ACCESS_TOKEN_MS,
        erro: null,
      });
    },
    [atualizarAtor],
  );

  const executarChamadaCrua = useCallback((idUsuario, caminho, opcoes) => {
    const token = tokensRef.current[idUsuario]?.accessToken ?? null;
    return fetch(`${API_BASE_URL}${caminho}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...(opcoes.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  const renovarAtor = useCallback(
    (idUsuario) => {
      if (renovacaoEmVooRef.current[idUsuario]) {
        return renovacaoEmVooRef.current[idUsuario];
      }
      const refreshToken = tokensRef.current[idUsuario]?.refreshToken;
      if (!refreshToken) {
        return Promise.reject(new Error('Ator sem refresh token, entre no elenco de novo.'));
      }
      const promessa = fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
        .then(tratarResposta)
        .then((resultado) => {
          salvarSessaoAtor(idUsuario, resultado);
          return resultado;
        })
        .catch((erro) => {
          const persistido = lerSessionStorage();
          delete persistido[idUsuario];
          gravarSessionStorage(persistido);
          atualizarAtor(idUsuario, { status: 'erro', erro: erro.message ?? 'Falha ao renovar sessão.' });
          throw erro;
        })
        .finally(() => {
          delete renovacaoEmVooRef.current[idUsuario];
        });
      renovacaoEmVooRef.current[idUsuario] = promessa;
      return promessa;
    },
    [atualizarAtor, salvarSessaoAtor],
  );

  // fetchComoAtor: equivalente do authFetch(), por ator. Renova UMA vez em
  // 401 e repete a chamada original (mesmo padrão de executarFetch em
  // use-auth.js). Devolve o corpo já parseado (tratarResposta), não o
  // Response cru, quem chama não precisa se preocupar em ler o corpo.
  const fetchComoAtor = useCallback(
    (idUsuario, caminho, opcoes = {}) => {
      const chaveVoo = `${idUsuario}:${caminho}`;
      const metodo = (opcoes.method ?? 'GET').toUpperCase();

      const executar = async () => {
        const inicio = performance.now();
        let respostaFetch = await executarChamadaCrua(idUsuario, caminho, opcoes);

        if (respostaFetch.status === 401 && tokensRef.current[idUsuario]?.refreshToken) {
          try {
            await renovarAtor(idUsuario);
            respostaFetch = await executarChamadaCrua(idUsuario, caminho, opcoes);
          } catch {
            // renovarAtor já marcou o ator como 'erro', segue com a
            // resposta 401 original, tratarResposta() abaixo lança.
          }
        }

        const ms = Math.round(performance.now() - inicio);
        let corpoRecebido = null;
        try {
          const texto = await respostaFetch.clone().text();
          corpoRecebido = texto ? JSON.parse(texto) : null;
        } catch {
          // mantém null, corpo não era JSON (raro, ex.: 204 sem corpo)
        }

        registrarChamada({
          ator: idUsuario,
          metodo,
          caminho,
          status: respostaFetch.status,
          ms,
          corpoEnviado: opcoes.body ? JSON.parse(opcoes.body) : null,
          corpoRecebido,
          ok: respostaFetch.ok,
        });

        return tratarResposta(respostaFetch);
      };

      if (metodo !== 'GET') {
        return executar();
      }

      let promessa = requisicoesEmVooRef.current.get(chaveVoo);
      if (!promessa) {
        // `.finally()` precisa ser encadeado NA MESMA promise que é
        // devolvida/guardada (não numa 2ª promise solta, descartada).
        // Achado ao vivo (22-08-2026): a versão com `promessa.finally(fn)`
        // numa linha separada criava uma promise derivada nunca lida por
        // ninguém, e o navegador acusava "unhandled promise rejection"
        // sempre que a chamada de fato falhava.
        promessa = executar().finally(() => requisicoesEmVooRef.current.delete(chaveVoo));
        requisicoesEmVooRef.current.set(chaveVoo, promessa);
      }
      return promessa;
    },
    [executarChamadaCrua, renovarAtor, registrarChamada],
  );

  // Checa (uma vez, em segundo plano) se o ator já tem perfil_pesquisador.
  // Não bloqueia a entrada, só atualiza o chip depois que resolver.
  // Passa por fetchComoAtor de propósito: é um GET real, vale aparecer no
  // Registro de Chamadas também.
  const checarPerfilPesquisador = useCallback(
    (idUsuario) => {
      fetchComoAtor(idUsuario, `/perfil-pesquisador/${idUsuario}`)
        .then(() => atualizarAtor(idUsuario, { temPerfilPesquisador: true }))
        .catch((erro) => {
          if (erro instanceof ErroHttp && erro.status === 404) {
            atualizarAtor(idUsuario, { temPerfilPesquisador: false });
          }
          // Qualquer outro erro: deixa `temPerfilPesquisador` como null,
          // não é crítico o bastante pra travar a entrada do ator.
        });
    },
    [fetchComoAtor, atualizarAtor],
  );

  // Entra no elenco como uma conta REAL específica. `email` vem de quem
  // chamou (uma linha de verdade de /usuario ou /perfil-pesquisador, não
  // mais um roster fixo). `idUsuario` também vem de quem chamou, só pra
  // já existir uma chave e mostrar "entrando..." antes da resposta do
  // login voltar confirmando quem é.
  const entrarComoUsuario = useCallback(
    async ({ idUsuario, email }) => {
      atualizarAtor(idUsuario, estadoInicialAtor());
      try {
        const resultado = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, senha: SENHA_SEED_DEV }),
        }).then(tratarResposta);
        salvarSessaoAtor(idUsuario, resultado);
        checarPerfilPesquisador(idUsuario);
        return resultado;
      } catch (erro) {
        atualizarAtor(idUsuario, { status: 'erro', erro: erro.message ?? 'Falha ao entrar.' });
        throw erro;
      }
    },
    [atualizarAtor, salvarSessaoAtor, checarPerfilPesquisador],
  );

  const sairDoElenco = useCallback(async (idUsuario) => {
    const refreshToken = tokensRef.current[idUsuario]?.refreshToken;
    delete tokensRef.current[idUsuario];
    const persistido = lerSessionStorage();
    delete persistido[idUsuario];
    gravarSessionStorage(persistido);
    setAtores((atuais) => {
      const proximo = { ...atuais };
      delete proximo[idUsuario];
      return proximo;
    });
    if (refreshToken) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {
        // Já limpamos localmente, mesma tolerância de logout() em
        // use-auth.js (sessão do backend expira sozinha em 30 dias).
      });
    }
  }, []);

  const descartarElenco = useCallback(() => {
    return Promise.allSettled(Object.keys(atores).map((idUsuario) => sairDoElenco(idUsuario)));
  }, [atores, sairDoElenco]);

  const limparRegistro = useCallback(() => setRegistroChamadas([]), []);

  // Rehidratação ao montar (F5 dentro da mesma aba): só os atores que
  // tinham refreshToken salvo em sessionStorage; falha vira status 'erro'
  // no chip (visível, não trava o app inteiro).
  useEffect(() => {
    const persistido = lerSessionStorage();
    Object.keys(persistido).forEach((idUsuario) => {
      tokensRef.current[idUsuario] = { accessToken: null, refreshToken: persistido[idUsuario] };
      atualizarAtor(idUsuario, estadoInicialAtor());
      renovarAtor(idUsuario)
        .then(() => checarPerfilPesquisador(idUsuario))
        .catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valor = useMemo(
    () => ({
      atores,
      registroChamadas,
      atorPadrao,
      selecionarAtorPadrao: setAtorPadrao,
      campanhaFoco,
      selecionarCampanhaFoco: setCampanhaFoco,
      entrarComoUsuario,
      sairDoElenco,
      renovarAtor,
      descartarElenco,
      fetchComoAtor,
      limparRegistro,
    }),
    [atores, registroChamadas, atorPadrao, campanhaFoco, entrarComoUsuario, sairDoElenco, renovarAtor, descartarElenco, fetchComoAtor, limparRegistro],
  );

  return <ElencoContext.Provider value={valor}>{children}</ElencoContext.Provider>;
}
