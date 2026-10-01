import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { MensagemErro } from './mensagem-erro';
import { Carregando } from '../layout/carregando';
import { Tooltip } from '../layout/tooltip';
import type { ReactNode } from 'react';
import { useFocoPreso } from '../../services/constant/hook/use-foco-preso';

interface ModalFichaProps {
  titulo: string;
  subtitulo?: string;
  // Explicação da tela num "ⓘ" ao lado do título (aparece ao passar o mouse), no lugar de um subtítulo longo.
  ajuda?: string;
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
  // Modal com mais de uma tela (abas ou etapas): abre já na altura cheia, e cada tela rola por dentro. Assim o
  // rodapé fica no mesmo lugar desde o começo, mesmo quando a próxima aba é mais alta que a primeira. O corpo vira
  // coluna flex: um filho com `flex-1` ocupa o espaço que sobra (ex.: a caixa de texto do Alterar Termo).
  variasTelas?: boolean;
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
  ajuda,
  avatar,
  badges,
  rodape,
  erro,
  carregando,
  aoFechar,
  children,
  fecharAoClicarFora = true,
  variasTelas = false,
}: ModalFichaProps) {
  const tituloExibido = carregando ? 'Carregando...' : titulo;
  const avatarExibido = carregando ? null : avatar;
  const subtituloExibido = carregando ? undefined : subtitulo;
  const badgesExibidos = carregando ? undefined : badges;
  // Nome acessível da janela: o leitor de tela anuncia "diálogo, <título>" ao abrir.
  const idTitulo = useId();
  // Foco do teclado preso na janela enquanto ela está aberta, e devolvido a quem abriu ao fechar.
  const janelaRef = useRef<HTMLDivElement>(null);
  // Esc fecha só esta janela, a de cima (ver useFocoPreso).
  useFocoPreso(janelaRef, true, aoFechar);

  // Modal que não "dança": preso no topo da tela (não centralizado), o cabeçalho e as abas ficam sempre no mesmo
  // lugar; e, enquanto está aberto, ele nunca encolhe (guarda a maior altura que já teve). Trocar de uma aba alta
  // para uma curta, ou de uma etapa para outra, não faz o rodapé subir: os botões ficam parados, como numa aba de
  // verdade, e não parece que outro modal abriu.
  const [alturaMinima, setAlturaMinima] = useState(0);
  useLayoutEffect(() => {
    const janela = janelaRef.current;
    if (!janela) {
      return;
    }
    const observador = new ResizeObserver(() => {
      const altura = janela.getBoundingClientRect().height;
      setAlturaMinima((anterior) => (altura > anterior ? altura : anterior));
    });
    observador.observe(janela);
    return () => observador.disconnect();
  }, []);

  // Ao abrir, a janela só aparece quando já está no tamanho final: enquanto carrega, e até o tamanho parar de mudar
  // por um instante (partes que chegam depois, como o score ou o histórico), ela fica transparente e o fundo mostra
  // "Carregando...". Sem isto, o "Carregando..." pequeno crescia na frente da pessoa e empurrava o rodapé.
  // Transparente, não escondida: o foco do teclado continua dentro da janela desde o primeiro instante.
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const janela = janelaRef.current;
    if (pronto || carregando || !janela) {
      return;
    }
    let espera = setTimeout(() => setPronto(true), 200);
    const limite = setTimeout(() => setPronto(true), 1500);
    const observador = new ResizeObserver(() => {
      clearTimeout(espera);
      espera = setTimeout(() => setPronto(true), 200);
    });
    observador.observe(janela);
    return () => {
      clearTimeout(espera);
      clearTimeout(limite);
      observador.disconnect();
    };
  }, [carregando, pronto]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[5vh] pb-4 bg-black/40"
      onClick={fecharAoClicarFora ? aoFechar : undefined}
      // Clique no FUNDO (só nele, não nos cliques de dentro da janela, que sobem até aqui) não tira o foco da
      // janela: senão o Esc, tratado dentro dela, pararia de funcionar.
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) evento.preventDefault();
      }}
    >
      {!pronto && (
        <div className="absolute top-[5vh] left-1/2 -translate-x-1/2 fundo-cartao rounded-full px-5 py-2 shadow-lg">
          <Carregando />
        </div>
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        ref={janelaRef}
        tabIndex={-1}
        className={
          'outline-none w-full max-w-5xl max-h-[90vh] fundo-cartao rounded-2xl shadow-2xl border borda-padrao overflow-hidden flex flex-col' +
          (variasTelas ? ' h-[90vh]' : '') +
          (pronto ? ' opacity-100 transition-opacity duration-150' : ' opacity-0 pointer-events-none')
        }
        aria-busy={!pronto}
        style={alturaMinima ? { minHeight: alturaMinima } : undefined}
        onClick={(evento) => evento.stopPropagation()}
      >
        {/* O X é irmão direto no flex externo (sem `flex-wrap` ali), e os badges moram DENTRO do bloco da
            esquerda (podem quebrar livre, sem afetar nada): se o X vivesse no mesmo grupo flex-wrap que os
            badges, com título comprido + 2 badges esse grupo inteiro quebraria linha e cairia embaixo do
            título, em vez de ficar fixo no canto superior direito. */}
        <div className="px-8 py-6 border-b borda-padrao faixa-marca flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {avatarExibido}
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 id={idTitulo} className="titulo-secao truncate">{tituloExibido}</h2>
                {ajuda && !carregando && <Tooltip texto={ajuda} baixo />}
              </div>
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

        <div className={'flex-1 px-8 py-6 space-y-6 overflow-y-auto' + (variasTelas ? ' flex flex-col' : '')}>
          <MensagemErro texto={erro} />
          {children}
        </div>

        {rodape && <div className="px-8 py-5 border-t borda-padrao faixa-marca shrink-0">{rodape}</div>}
      </div>
    </div>
  );
}
