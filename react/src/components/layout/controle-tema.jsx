import { useEffect, useRef, useState } from 'react';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

const CHAVE_LOCALSTORAGE = 'crowdacademico.tema';
const TEMA_PADRAO = 'claro';
const TEMAS = ['claro', 'escuro', 'sistema'];
const CONFIG_TEMA = {
  claro: { icone: 'fa-sun', rotulo: 'Tema claro (clique pra escuro)' },
  escuro: { icone: 'fa-moon', rotulo: 'Tema escuro (clique pra seguir o sistema)' },
  sistema: { icone: 'fa-circle-half-stroke', rotulo: 'Seguindo o tema do sistema (clique pro claro)' },
};

function lerTemaSalvo() {
  const salvo = localStorage.getItem(CHAVE_LOCALSTORAGE);
  return TEMAS.includes(salvo) ? salvo : TEMA_PADRAO;
}

// Botão de tema no cabeçalho (09-08-2026, Bloco A do prompt do Claude Web
// sobre dark mode) — useState(lerTemaSalvo) como inicializador preguiçoso
// (evita flash do tema errado no primeiro render) + useEffect que aplica e
// persiste. A diferença é ONDE aplica: data-tema é um ATRIBUTO em <html>,
// não uma custom property — 1-base.css tem os 3 blocos de tokens (:root =
// claro, :root[data-tema='escuro'], @media(prefers-color-scheme:dark) +
// [data-tema='sistema']) que reagem a esse atributo sozinhos, nenhum
// componente além deste precisa saber que o tema mudou.
// Ciclo claro → escuro → sistema → claro (pedido explícito do Lucas).
//
// Preferência POR CONTA (10-08-2026, pedido do Lucas: "loguei com outra
// conta... continuaram com o que já estava marcado") — `auth` opcional
// (usado no cabeçalho e em Minha Conta, os 2 lugares logados; sem `auth`
// continua funcionando só com localStorage, ex.: tela de login). Não
// substitui o localStorage, os dois coexistem: localStorage é o padrão de
// DISPOSITIVO (usado deslogado, ou antes da conta carregar), a conta é a
// fonte de verdade assim que está logada.
export function ControleTema({ auth }) {
  const [tema, setTema] = useState(lerTemaSalvo);
  const estavaAutenticado = useRef(auth?.autenticado ?? false);

  // Aplica a preferência salva NA CONTA assim que ela chega (login, ou
  // reload com sessão já válida) — só quando a conta TEM uma preferência
  // salva (temaPreferido NULL = nunca mexeu, mantém o que já estava).
  useEffect(() => {
    const salvo = auth?.usuario?.temaPreferido;
    if (salvo && TEMAS.includes(salvo)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTema(salvo);
    }
  }, [auth?.usuario?.idUsuario, auth?.usuario?.temaPreferido]);

  // Reseta pro padrão ao deslogar (pedido do Lucas: "seria bom voltar ao
  // padrão ao deslogar") — só na TRANSIÇÃO logado→deslogado, não toda vez
  // que `auth` muda (senão resetaria a cada re-render enquanto deslogado).
  useEffect(() => {
    const autenticadoAgora = auth?.autenticado ?? false;
    if (estavaAutenticado.current && !autenticadoAgora) {
      setTema(TEMA_PADRAO);
    }
    estavaAutenticado.current = autenticadoAgora;
  }, [auth?.autenticado]);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem(CHAVE_LOCALSTORAGE, tema);
  }, [tema]);

  const proximoTema = () => {
    const indiceAtual = TEMAS.indexOf(tema);
    const novoTema = TEMAS[(indiceAtual + 1) % TEMAS.length];
    setTema(novoTema);

    // Salva na conta em segundo plano — sem travar o clique nem mostrar
    // toast de erro, é só uma preferência de UI, uma falha aqui não
    // deveria incomodar quem só queria trocar o tema (ex.: a migração
    // ainda não rodou no banco — ver SAVEPOINT em usuario.service.findone.ts).
    // Merge LOCAL do valor que a gente já sabe que mandou, não o que o
    // PATCH devolveu — a resposta desse endpoint não inclui
    // temaPreferido/escalaFontePreferida (só o findone/login inclui, via
    // busca protegida à parte), então confiar nela aqui sobrescreveria com
    // `null` mesmo quando o salvamento deu certo.
    if (auth?.autenticado) {
      usuarioApi
        .atualizar(auth.authFetch, auth.usuario.idUsuario, { temaPreferido: novoTema })
        .then(() => auth.atualizarUsuarioLocal({ ...auth.usuario, temaPreferido: novoTema }))
        .catch(() => {});
    }
  };

  const { icone, rotulo } = CONFIG_TEMA[tema];

  return (
    <button
      type="button"
      onClick={proximoTema}
      aria-label={rotulo}
      title={rotulo}
      className="flex items-center justify-center w-9 h-9 borda-padrao border rounded-lg texto-padrao hover-fundo-sutil transition-colors"
    >
      <i className={'fa-solid ' + icone}></i>
    </button>
  );
}
