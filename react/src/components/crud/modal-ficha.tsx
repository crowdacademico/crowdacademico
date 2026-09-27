import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFocoPreso } from '../../services/constant/hook/use-foco-preso';
import { MensagemErro } from './mensagem-erro';

interface ModalFichaProps {
  titulo: string;
  subtitulo?: string;
  avatar?: ReactNode;
  badges?: ReactNode[];
  rodape?: ReactNode;
  // Texto de erro (o `erro` de useErroToast): aparece no topo do corpo, antes de `children`.
  erro?: string;
  // `carregando`: sem esta prop, cada modal (ModalConsultarUsuario/ModalAlterarUsuario/Alterar Campanha de T2)
  // reescreveria `titulo={dado?.campo ?? `#${id}`}` + `avatar={dado && (...)}`, e por uma fração de segundo
  // (entre abrir o modal e a requisição voltar) piscaria um "#id" cru e o "?" do AvatarUsuario sem nome (que
  // cairia numa cor de fundo vermelha por coincidência de hash, parecendo erro). Com `carregando={true}`, este
  // componente já mostra "Carregando..." e esconde avatar/subtítulo/badges sozinho: o chamador só passa a flag.
  // NÃO mexe em `rodape`/`children` de propósito: cada modal continua livre para decidir o que mostrar no corpo
  // enquanto carrega (alguns querem mostrar um erro ali em vez de "Carregando...") e se o rodapé fica visível
  // ou não nesse meio-tempo.
  carregando?: boolean;
  aoFechar: () => void;
  children?: ReactNode;
  // `fecharAoClicarFora`: `true` por padrão, preservando o comportamento de todo o painel. `false` só tira o
  // clique no fundo escurecido da lista de caminhos de fechar (um miss click interromperia um wizard de várias
  // etapas, como Criar Campanha); o X continua funcionando (é o outro caminho, intencionalmente separado
  // deste).
  fecharAoClicarFora?: boolean;
}

// Mesma moldura de ModalDetalhe (backdrop + cartão + botão fechar), só que largo (max-w-5xl, igual
// FichaConsulta largura="larga") e recebendo children livre em vez de uma lista fixa de `secoes`: pensado para
// Consultar/Alterar que já usam <SecaoFicha>/<CampoFicha> (os MESMOS blocos da página real), só que dentro de
// um modal (T1 do Campo de Testes replica a aparência exata de Consultar/Alterar Usuário, sem reinventar o
// layout).
//
// NOTA: os 3 caminhos de fechar (botão de fechar, clique no fundo escurecido, desligável via
// `fecharAoClicarFora={false}`, e a tecla Esc, sempre ligada, mesmo com `fecharAoClicarFora={false}`: Esc é uma
// ação deliberada, igual clicar no X, não um acidente como o clique fora) passam todos pela MESMA prop
// `aoFechar`, de propósito: é o que permite `ModalAlterarUsuario` embrulhar `aoFechar` com uma guarda de
// "alteração não salva" numa linha só, sem esta casca precisar saber nada sobre isso. Qualquer caminho de
// fechar novo que alguém adicionar aqui TEM que continuar chamando `aoFechar`, nunca fechar "por conta
// própria": senão vira um caminho extra que escapa de qualquer guarda que um chamador tenha embrulhado em cima.
export function ModalFicha({
  titulo,
  subtitulo,
  avatar,
  badges,
  rodape,
  erro,
  carregando,
  aoFechar,
  children,
  fecharAoClicarFora = true,
}: ModalFichaProps) {
  const tituloExibido = carregando ? 'Carregando...' : titulo;
  const avatarExibido = carregando ? null : avatar;
  const subtituloExibido = carregando ? undefined : subtitulo;
  const badgesExibidos = carregando ? undefined : badges;
  // Nome acessível da janela: o leitor de tela anuncia "diálogo, <título>" ao abrir.
  const idTitulo = useId();
  // Foco do teclado preso na janela enquanto ela está aberta, e devolvido a quem abriu ao fechar.
  const janelaRef = useRef<HTMLDivElement>(null);
  useFocoPreso(janelaRef);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
      onClick={fecharAoClicarFora ? aoFechar : undefined}
      // Clique no FUNDO (só nele, não nos cliques de dentro da janela, que sobem até aqui) não tira o foco da
      // janela: senão o Esc, tratado dentro dela, pararia de funcionar.
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) evento.preventDefault();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        ref={janelaRef}
        tabIndex={-1}
        // Esc fecha SÓ esta janela: o foco está dentro dela (useFocoPreso), e parar a propagação impede que uma
        // janela aberta por baixo (ex.: o Alterar, com o detalhe de um item por cima) feche junto.
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') {
            evento.stopPropagation();
            aoFechar();
          }
        }}
        className="outline-none w-full max-w-5xl max-h-[90vh] fundo-cartao rounded-2xl shadow-2xl border borda-padrao overflow-hidden flex flex-col"
        onClick={(evento) => evento.stopPropagation()}
      >
        {/* O X é irmão direto no flex externo (sem `flex-wrap` ali), e os badges moram DENTRO do bloco da
            esquerda (podem quebrar livre, sem afetar nada): se o X vivesse no mesmo grupo flex-wrap que os
            badges, com título comprido + 2 badges esse grupo inteiro quebraria linha e cairia embaixo do
            título, em vez de ficar fixo no canto superior direito. */}
        <div className="px-8 py-6 border-b borda-padrao fundo-sutil flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {avatarExibido}
            <div className="min-w-0">
              <h2 id={idTitulo} className="titulo-secao truncate">{tituloExibido}</h2>
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

        <div className="px-8 py-6 space-y-6 overflow-y-auto">
          <MensagemErro texto={erro} />
          {children}
        </div>

        {rodape && <div className="px-8 py-5 border-t borda-padrao fundo-cartao shrink-0">{rodape}</div>}
      </div>
    </div>
  );
}
