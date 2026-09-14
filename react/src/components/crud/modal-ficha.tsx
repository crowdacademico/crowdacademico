import type { ReactNode } from 'react';

interface ModalFichaProps {
  titulo: string;
  subtitulo?: string;
  avatar?: ReactNode;
  badges?: ReactNode[];
  rodape?: ReactNode;
  // `carregando` (14-09-2026, pedido do Lucas: "como serão vários modal,
  // não é melhor a gente criar um componente... pra evitar hardcoded?") -
  // ANTES desta prop, cada modal (ModalConsultarUsuario/ModalAlterarUsuario/
  // Alterar Campanha de T2) reescrevia sozinho `titulo={dado?.campo ??
  // \`#${id}\`}` + `avatar={dado && (...)}`, e por uma fração de segundo -
  // entre abrir o modal e a requisição voltar - isso piscava um "#id" cru e
  // o "?" do AvatarUsuario sem nome (que caía numa cor de fundo vermelha
  // por coincidência de hash, parecendo erro). Com `carregando={true}`,
  // este componente já mostra "Carregando..." e esconde avatar/subtítulo/
  // badges sozinho - o chamador só passa a flag, não reimplementa o
  // fallback. NÃO mexe em `rodape`/`children` de propósito - cada modal
  // continua livre pra decidir o que mostrar no corpo enquanto carrega
  // (alguns querem mostrar um erro ali em vez de "Carregando...") e se o
  // rodapé deve ficar visível ou não nesse meio-tempo.
  carregando?: boolean;
  aoFechar: () => void;
  children?: ReactNode;
}

// Mesma moldura de ModalDetalhe (backdrop + cartão + botão fechar), só que
// largo (max-w-5xl, igual FichaConsulta largura="larga") e recebendo
// children livre em vez de uma lista fixa de `secoes` - pensado pra
// Consultar/Alterar que já usam <SecaoFicha>/<CampoFicha> (os MESMOS
// blocos da página real), só que dentro de um modal (07-09-2026, Campo de
// Testes: T1 replicando a aparência exata de Consultar/Alterar Usuário,
// sem reinventar o layout).
//
// NOTA (13-09-2026, achado do Claude Web): os 3 caminhos de fechar (botão
// de fechar, clique no fundo escurecido, e o que o chamador decidir passar
// como `aoFechar`) já passam todos pela MESMA prop `aoFechar` - de
// propósito, é o que permite `ModalAlterarUsuario` embrulhar `aoFechar`
// com uma guarda de "alteração não salva" numa linha só, sem esta casca
// precisar saber nada sobre isso. Este componente hoje NÃO trata a tecla
// Esc (sorte, não desenho - Esc simplesmente não faz nada agora). Se um
// dia alguém adicionar suporte a Esc aqui, ele TEM que fechar chamando
// `aoFechar`, nunca fechar "por conta própria" - senão vira um 4º caminho
// que escapa de qualquer guarda que um chamador tenha embrulhado em cima.
export function ModalFicha({ titulo, subtitulo, avatar, badges, rodape, carregando, aoFechar, children }: ModalFichaProps) {
  const tituloExibido = carregando ? 'Carregando...' : titulo;
  const avatarExibido = carregando ? null : avatar;
  const subtituloExibido = carregando ? undefined : subtitulo;
  const badgesExibidos = carregando ? undefined : badges;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
      onClick={aoFechar}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] fundo-cartao rounded-2xl shadow-2xl border borda-padrao overflow-hidden flex flex-col"
        onClick={(evento) => evento.stopPropagation()}
      >
        {/* CORRIGIDO (08-09-2026, achado do Lucas: "T2 não tem o X pra
            fechar no topo direito") - o X vivia dentro do MESMO grupo
            flex-wrap que os badges; com título comprido + 2 badges, esse
            grupo inteiro quebrava linha e caía embaixo do título, em vez
            de ficar fixo no canto. Badges agora moram DENTRO do bloco da
            esquerda (podem quebrar livre, sem afetar nada) - o X é irmão
            direto no flex externo, sem `flex-wrap` ali, nunca sai do
            canto superior direito. */}
        <div className="px-8 py-6 border-b borda-padrao fundo-sutil flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {avatarExibido}
            <div className="min-w-0">
              <h2 className="titulo-secao truncate">{tituloExibido}</h2>
              {subtituloExibido && <p className="text-sm texto-fraco mt-1 break-words">{subtituloExibido}</p>}
              {badgesExibidos && badgesExibidos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">{badgesExibidos}</div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="texto-fraco hover-texto-forte shrink-0"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div className="px-8 py-6 space-y-6 overflow-y-auto">{children}</div>

        {rodape && <div className="px-8 py-5 border-t borda-padrao fundo-cartao shrink-0">{rodape}</div>}
      </div>
    </div>
  );
}
