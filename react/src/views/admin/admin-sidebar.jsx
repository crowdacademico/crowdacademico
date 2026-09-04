import { NavLink } from 'react-router';
import { abrirBuscaGlobal } from '../../components/layout/busca-global-evento';
import { Tooltip } from '../../components/layout/tooltip';
import { GRUPOS_MENU_ADMIN } from './admin-menu.constants';

// Menu lateral - coluna fixa a partir de 1377px (grid em .admin-shell,
// 3-admin-shell.css), gaveta (drawer) por cima do conteúdo em telas
// menores. `min-[1377px]:` (25-08-2026, ERA `xl:`, Tailwind fixo em
// 1280px) - breakpoint ARBITRÁRIO do Tailwind (não um dos padrão tipo
// lg/xl), só pra este componente. Achado do Lucas ao vivo: com `xl:`
// fixo em 1280px e a media query do grid (3-admin-shell.css) editada
// separadamente pra outro valor (tentando calibrar), a faixa entre os
// dois virava um estado quebrado ("bug da tela branca") - a sidebar já
// tinha virado `position:static` pelo Tailwind, mas o grid ainda só
// reservava 1 coluna, sem espaço pra ela. Tentativa de token
// `--breakpoint-sidebar` central (@theme) não funciona aqui - este
// componente é escaneado pelo Tailwind normalmente (JSX sempre é), mas
// 3-admin-shell.css entra por um pipeline de CSS separado do de
// tailwind-theme.css (ver comentário completo em 3-admin-shell.css, e o
// mesmo problema já documentado pra @utility em 1-base.css) - `theme()`
// não resolve lá. Por isso o número (1377px) é literal aqui E lá - ao
// mudar um, busque pelo mesmo valor ("1377px") no projeto pra achar o
// outro lado e trocar junto. Itens com `caminho` são NavLink de verdade
// (URL muda, dá pra linkar direto, botão Voltar funciona, F5 mantém a
// aba) - item ativo é quem o próprio NavLink decide, comparando com a
// URL atual, não um state comparado à mão.
//
// `min-[1377px]:relative` (25-08-2026, ERA `min-[1377px]:static` - pedido
// do Lucas: a faixa do botão "Menu" - ver admin-layout.jsx - precisa ficar
// por BAIXO da sidebar, escondida atrás dela, não empurrando ela pra
// baixo). `position:static` NÃO participa de z-index de jeito nenhum
// (regra do CSS: z-index só tem efeito em elemento posicionado) - trocar
// pra `relative` (visualmente idêntico, mesma posição no fluxo normal do
// grid) deixa a sidebar entrar na mesma "categoria" de empilhamento da
// faixa (position:absolute em admin-layout.jsx) e, por vir DEPOIS dela no
// HTML (ver ordem em admin-layout.jsx), pinta por CIMA automaticamente -
// sem precisar declarar z-index nenhum à mão, é só ordem de DOM entre dois
// elementos posicionados. Resultado: a sidebar cobre (esconde) a faixa
// atrás dela sozinha, só porque tem fundo opaco e está na frente - exatamente
// o pedido do Lucas.
export function AdminSidebar({ aberto, aoFechar }) {
  return (
    <>
      {/* Fundo escuro atrás da gaveta - só existe abrindo (clique fora) e só no mobile. */}
      {aberto && (
        <div
          className="fixed inset-0 bg-black/40 z-30 min-[1377px]:hidden"
          onClick={aoFechar}
          aria-hidden="true"
        />
      )}

      <aside
        className={
          'admin-sidebar fixed top-16 bottom-0 left-0 z-40 w-[260px] overflow-y-auto ' +
          'transition-transform duration-200 min-[1377px]:relative min-[1377px]:top-auto min-[1377px]:bottom-auto min-[1377px]:z-auto ' +
          'min-[1377px]:w-auto min-[1377px]:translate-x-0 ' +
          (aberto ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="admin-sidebar__titulo">Painel Administrativo</div>
        <div className="admin-sidebar__subtitulo">CrowdAcadêmico</div>

        {/* Busca global (09-08-2026) - Ctrl+K abre de qualquer lugar, mas
            um atalho sozinho não é descobrível; este botão é a pista
            visível de que ele existe (ver components/layout/
            busca-global.jsx). */}
        <button
          type="button"
          onClick={abrirBuscaGlobal}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 my-3 rounded-md border borda-forte fundo-sutil text-sm texto-fraco hover-fundo-sutil transition-colors"
        >
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-magnifying-glass"></i> Buscar
          </span>
          <kbd className="text-[10px] font-bold border borda-forte rounded px-1.5 py-0.5 fundo-cartao">
            Ctrl K
          </kbd>
        </button>

        <hr className="admin-sidebar__separador" />

        {GRUPOS_MENU_ADMIN.map((grupo) => (
          <div key={grupo.titulo ?? 'sem-titulo'}>
            {/* Dashboard (08-08-2026) é um grupo sem título - item solo,
                não uma seção de cadastro - só ganha a linha divisória
                embaixo (divisorApos), não o rótulo maiúsculo de grupo. */}
            {grupo.titulo && (
              <div className="admin-sidebar__grupo-titulo">
                <span>{grupo.titulo}</span>
                {/* `dica` (22-08-2026, grupo "CAMPO DE TESTES") - Tooltip
                    no lugar do ícone normal de item, só quando o grupo
                    define uma explicação (os outros grupos não têm). */}
                {grupo.dica && <Tooltip texto={grupo.dica} />}
              </div>
            )}
            {grupo.itens.map((item) =>
              item.desabilitado ? (
                <button
                  key={item.rotulo}
                  type="button"
                  disabled
                  className="admin-sidebar__item admin-sidebar__item--desabilitado"
                  title="Ainda não implementado"
                >
                  <span>{item.rotulo}</span>
                </button>
              ) : (
                <NavLink
                  key={item.caminho}
                  to={item.caminho}
                  onClick={aoFechar}
                  className={({ isActive }) =>
                    'admin-sidebar__item' + (isActive ? ' admin-sidebar__item--ativo' : '')
                  }
                >
                  <span>{item.rotulo}</span>
                  {/* Mesmos ícones da busca global (09-08-2026, pedido do
                      Lucas) - à direita, não à esquerda como lá: o item já
                      usa justify-content: space-between
                      (3-admin-shell.css), então o ícone cai sozinho na
                      borda direita de cada botão, alinhado verticalmente
                      com os outros (mesma largura de coluna). Cor vem de
                      herdar o `color` do item (cinza no normal, escuro no
                      ativo) - sem classe própria. */}
                  {item.icone && <i className={'fa-solid ' + item.icone}></i>}
                </NavLink>
              ),
            )}
            {grupo.divisorApos && <hr className="admin-sidebar__separador" />}
          </div>
        ))}
      </aside>
    </>
  );
}
