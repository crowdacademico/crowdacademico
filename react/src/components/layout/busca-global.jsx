import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ROTAS_ADMIN } from '../../services/router/rotas.constants';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { papelApi, permissaoApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { EVENTO_ABRIR_BUSCA_GLOBAL as EVENTO_ABRIR } from './busca-global-evento';

// Derivado de ROTAS_ADMIN (09-08-2026), não mais uma lista à mão — era uma
// cópia manual das 4 abas que podia desalinhar (mesmo problema que
// ROTAS_ADMIN/GRUPOS_MENU_ADMIN já resolveram uma vez pro menu lateral).
// Ícone aqui é o MESMO que aparece no menu lateral (rota.icone) — pedido
// do Lucas ao ver a busca: "coloca estes exatos ícones no menu também".
const NAVEGACAO = ROTAS_ADMIN.map((rota) => ({
  categoria: 'Navegação',
  rotulo: rota.rotuloMenu,
  caminho: rota.caminho,
  icone: rota.icone,
}));

// Catálogos pequenos hoje (dezenas de linhas) — busca 100% no navegador,
// não justifica endpoint de busca no backend ainda (mesmo raciocínio de
// TAMANHO_PAGINA_PADRAO em paginacao.util.ts: "não faz sentido construir
// isso contra 17 linhas de teste"). Revisar se algum catálogo crescer bem
// além disso.
const LIMITE_POR_CATEGORIA = 5;

function contem(texto, termo) {
  return (texto ?? '').toLowerCase().includes(termo);
}

// Busca global — Ctrl+K/Cmd+K (09-08-2026, pedido do Lucas depois de
// gostar da sugestão: "vamos aplicar pra eu ver como fico"). Um modal só
// que busca por nome/e-mail/chave em usuário/papel/permissão/configuração
// ao mesmo tempo, e também pula direto pras 4 abas do menu. Carrega os 4
// catálogos só na PRIMEIRA vez que abre (mesma convenção de
// LogAuditoriaPainel — não gasta requisição em quem nunca aperta Ctrl+K),
// guarda em cache pro resto da sessão.
export function BuscaGlobal({ auth }) {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const [indiceSelecionado, setIndiceSelecionado] = useState(0);
  const [dados, setDados] = useState(null); // null = ainda não carregou
  const [carregando, setCarregando] = useState(false);
  const inputRef = useRef(null);

  const carregarDados = useCallback(() => {
    if (dados || carregando) {
      return;
    }
    setCarregando(true);
    Promise.all([
      usuarioApi.listar(auth.authFetch),
      papelApi.listar(auth.authFetch),
      permissaoApi.listar(auth.authFetch),
      configuracaoApi.listar(auth.authFetch),
    ])
      .then(([usuarios, papeis, permissoes, configuracoes]) => {
        setDados({ usuarios, papeis, permissoes, configuracoes });
      })
      .catch(() => setDados({ usuarios: [], papeis: [], permissoes: [], configuracoes: [] }))
      .finally(() => setCarregando(false));
  }, [auth.authFetch, dados, carregando]);

  const abrir = useCallback(() => {
    setAberto(true);
    setTermo('');
    setIndiceSelecionado(0);
    carregarDados();
  }, [carregarDados]);

  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    function aoTeclarGlobal(evento) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        abrir();
      }
    }
    function aoReceberEventoAbrir() {
      abrir();
    }
    window.addEventListener('keydown', aoTeclarGlobal);
    window.addEventListener(EVENTO_ABRIR, aoReceberEventoAbrir);
    return () => {
      window.removeEventListener('keydown', aoTeclarGlobal);
      window.removeEventListener(EVENTO_ABRIR, aoReceberEventoAbrir);
    };
  }, [abrir]);

  useEffect(() => {
    if (aberto) {
      inputRef.current?.focus();
    }
  }, [aberto]);

  const resultados = useMemo(() => {
    const termoBusca = termo.trim().toLowerCase();

    if (!termoBusca) {
      return NAVEGACAO;
    }

    const lista = NAVEGACAO.filter((item) => contem(item.rotulo, termoBusca));

    if (dados) {
      lista.push(
        ...dados.usuarios
          .filter((u) => contem(u.nome, termoBusca) || contem(u.email, termoBusca))
          .slice(0, LIMITE_POR_CATEGORIA)
          .map((u) => ({
            categoria: 'Usuários',
            rotulo: u.nome,
            subtitulo: u.email,
            caminho: `/admin/usuarios/${u.idUsuario}/consultar`,
            icone: 'fa-user',
          })),
        ...dados.papeis
          .filter((p) => contem(p.nome, termoBusca))
          .slice(0, LIMITE_POR_CATEGORIA)
          .map((p) => ({
            categoria: 'Papéis',
            rotulo: p.nome,
            caminho: `/admin/papeis/${p.idPapel}/alterar`,
            icone: 'fa-user-shield',
          })),
        // Permissão não tem tela própria (catálogo só-leitura) — manda pra
        // Papéis & Permissões, onde ela aparece na matriz/listagem.
        ...dados.permissoes
          .filter((p) => contem(p.nome, termoBusca))
          .slice(0, LIMITE_POR_CATEGORIA)
          .map((p) => ({
            categoria: 'Permissões',
            rotulo: p.nome,
            caminho: '/admin/papeis',
            icone: 'fa-key',
          })),
        ...dados.configuracoes
          .filter((c) => contem(c.chave, termoBusca) || contem(c.descricao, termoBusca))
          .slice(0, LIMITE_POR_CATEGORIA)
          .map((c) => ({
            categoria: 'Parâmetros',
            rotulo: c.chave,
            subtitulo: c.descricao,
            caminho: `/admin/configuracoes/${c.idConfig}/consultar`,
            icone: 'fa-sliders',
          })),
      );
    }

    return lista;
  }, [termo, dados]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIndiceSelecionado(0), [resultados.length, termo]);

  const irPara = useCallback(
    (item) => {
      navigate(item.caminho);
      fechar();
    },
    [navigate, fechar],
  );

  const aoTeclarInput = (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceSelecionado((i) => Math.min(i + 1, resultados.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceSelecionado((i) => Math.max(i - 1, 0));
    } else if (evento.key === 'Enter' && resultados[indiceSelecionado]) {
      evento.preventDefault();
      irPara(resultados[indiceSelecionado]);
    } else if (evento.key === 'Escape') {
      fechar();
    }
  };

  if (!aberto) {
    return null;
  }

  const grupos = [];
  for (const item of resultados) {
    let grupo = grupos.find((g) => g.categoria === item.categoria);
    if (!grupo) {
      grupo = { categoria: item.categoria, itens: [] };
      grupos.push(grupo);
    }
    grupo.itens.push(item);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4 bg-black/40"
      onClick={fechar}
    >
      <div
        className="w-full max-w-lg fundo-elevado rounded-2xl shadow-2xl border borda-forte overflow-hidden"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b borda-padrao">
          <i className="fa-solid fa-magnifying-glass texto-fraco"></i>
          <input
            ref={inputRef}
            type="text"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            onKeyDown={aoTeclarInput}
            placeholder="Buscar usuário, papel, permissão, parâmetro..."
            className="flex-1 outline-none text-sm texto-forte bg-transparent placeholder:texto-fraco"
          />
          <kbd className="text-[10px] font-bold texto-fraco border borda-forte rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {carregando && <p className="px-4 py-3 text-sm texto-fraco">Carregando...</p>}
          {!carregando && resultados.length === 0 && (
            <p className="px-4 py-3 text-sm texto-fraco">Nada encontrado para "{termo}".</p>
          )}
          {grupos.map((grupo) => (
            <div key={grupo.categoria}>
              <div className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-widest texto-fraco">
                {grupo.categoria}
              </div>
              {grupo.itens.map((item) => {
                const indice = resultados.indexOf(item);
                const selecionado = indice === indiceSelecionado;
                return (
                  <button
                    key={`${item.categoria}-${item.rotulo}-${indice}`}
                    type="button"
                    onClick={() => irPara(item)}
                    onMouseEnter={() => setIndiceSelecionado(indice)}
                    className={
                      'w-full flex items-center gap-3 px-4 py-2 text-left text-sm ' +
                      (selecionado ? 'fundo-realce' : '')
                    }
                  >
                    <i
                      className={'fa-solid ' + (item.icone ?? 'fa-circle') + ' texto-fraco w-4'}
                    ></i>
                    <span className="flex-1 min-w-0">
                      <span className="block texto-forte font-medium truncate">
                        {item.rotulo}
                      </span>
                      {item.subtitulo && (
                        <span className="block text-xs texto-fraco truncate">
                          {item.subtitulo}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
