import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toast-context';
import type { TipoToast } from './toast-context';

// Os dois somem sozinhos (decisão do Lucas: o erro preso na tela, até alguém fechar, atrapalhava). O erro fica o
// dobro do tempo, porque costuma ter mais o que ler; o X fecha antes, e o próximo aviso toma o lugar dele.
const DURACAO_SUCESSO_MS = 4000;
const DURACAO_ERRO_MS = 8000;
const MAXIMO_NA_TELA = 3;
// Aviso igual chegando dentro desta janela é a chamada dupla do <StrictMode> do desenvolvimento (cada efeito roda
// duas vezes), não a pessoa repetindo a ação: o tempo recomeça, mas sem a pulsada.
const JANELA_SEM_PULSO_MS = 500;

// Sucesso e erro têm a MESMA estrutura: cartão branco + barra colorida de 4px na esquerda + ícone. A cor é
// ACENTO (a barra/ícone), não fundo; texto sempre escuro (nunca branco sobre colorido), o que resolve a
// legibilidade em monitor não calibrado.
//
// A barra é `border-left` do próprio cartão, não uma <div> quadrada separada dentro de um pai com
// `overflow-hidden` + `rounded-xl`: contar com o clipping para arredondar um retângulo reto exatamente no raio
// do cantinho deixa uma frestinha sub-pixel em alguns browsers/zoom ("parte colorida no cantinho e parte branca
// atrás"); uma borda SEMPRE acompanha o border-radius do elemento dela, sem costura, e não depende de overflow
// cortar nada.
// `corBorda` usa os tokens `.borda-erro`/`.borda-sucesso` (camada `--cor-*`), não
// `border-emerald-500`/`border-red-500` crus do Tailwind: o toast aparece em toda ação do painel e precisa
// responder ao tema escuro.
const CONFIG_TIPO: Record<TipoToast, { corBorda: string; corIcone: string; icone: string }> = {
  sucesso: {
    corBorda: 'borda-sucesso',
    corIcone: 'texto-sucesso',
    icone: 'fa-solid fa-circle-check',
  },
  erro: {
    corBorda: 'borda-erro',
    corIcone: 'texto-erro',
    icone: 'fa-solid fa-circle-exclamation',
  },
};

interface Toast {
  id: number;
  titulo: string;
  descricao?: string;
  tipo: TipoToast;
  // Encolhendo para sair (a classe anima; o aviso é apagado quando a animação termina).
  saindo: boolean;
  // Quantas vezes o mesmo aviso chegou de novo: muda a `key` do cartão, o que reinicia a pulsada.
  repeticoes: number;
  ultimaChegada: number;
}

interface ToastProviderProps {
  children: ReactNode;
}

// Confirmação visual reaproveitável (criar/alterar/consultar/excluir e qualquer módulo futuro): qualquer
// componente chama `useToast().mostrar(titulo, descricao, tipo)` (ver use-toast), não precisa saber onde o
// toast é desenhado nem gerenciar timeout sozinho.
//
// Duas linhas de propósito: "Usuário 18 alterado com sucesso." de uma vez só não deixa claro nem A AÇÃO nem O
// ID; título grande e curto ("Usuário alterado com sucesso.") e uma descrição menor embaixo com o dado
// específico ("ID: 18 foi alterado").
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Cópia síncrona da lista: `mostrar` decide (repetido? passou do máximo?) e agenda o tempo na mesma chamada, sem
  // efeito colateral dentro do setState (que o <StrictMode> roda duas vezes).
  const lista = useRef<Toast[]>([]);
  const relogios = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const proximoId = useRef(0);

  const trocarLista = useCallback((nova: Toast[]) => {
    lista.current = nova;
    setToasts(nova);
  }, []);

  const iniciarSaida = useCallback(
    (id: number) => {
      clearTimeout(relogios.current.get(id));
      relogios.current.delete(id);
      trocarLista(lista.current.map((toast) => (toast.id === id ? { ...toast, saindo: true } : toast)));
    },
    [trocarLista],
  );

  const apagar = useCallback(
    (id: number) => {
      trocarLista(lista.current.filter((toast) => toast.id !== id));
    },
    [trocarLista],
  );

  const contarTempo = useCallback(
    (toast: Toast) => {
      clearTimeout(relogios.current.get(toast.id));
      relogios.current.set(
        toast.id,
        setTimeout(() => iniciarSaida(toast.id), toast.tipo === 'sucesso' ? DURACAO_SUCESSO_MS : DURACAO_ERRO_MS),
      );
    },
    [iniciarSaida],
  );

  const mostrar = useCallback(
    (titulo: string, descricao?: string, tipo: TipoToast = 'sucesso') => {
      const agora = Date.now();
      // Aviso igual ao que já está na tela não empilha: o tempo dele recomeça do zero e ele dá uma pulsada, para a
      // pessoa ver que a ação repetida chegou (sem isso, repetir perto do fim fazia o aviso sumir logo depois).
      const igual = lista.current.find(
        (toast) => !toast.saindo && toast.titulo === titulo && toast.descricao === descricao && toast.tipo === tipo,
      );
      if (igual) {
        const pulsar = agora - igual.ultimaChegada > JANELA_SEM_PULSO_MS;
        const atualizado = pulsar ? { ...igual, repeticoes: igual.repeticoes + 1, ultimaChegada: agora } : igual;
        if (pulsar) {
          trocarLista(lista.current.map((toast) => (toast.id === igual.id ? atualizado : toast)));
        }
        contarTempo(atualizado);
        return;
      }
      // Fila: o novo entra EMBAIXO dos que já estão na tela (ordem de chegada, de cima para baixo); cada um sai no
      // seu tempo e os de baixo sobem deslizando. No máximo MAXIMO_NA_TELA: chegando mais um, o mais antigo sai.
      const novo: Toast = {
        id: proximoId.current++,
        titulo,
        descricao,
        tipo,
        saindo: false,
        repeticoes: 0,
        ultimaChegada: agora,
      };
      trocarLista([...lista.current, novo]);
      contarTempo(novo);
      const naTela = lista.current.filter((toast) => !toast.saindo);
      if (naTela.length > MAXIMO_NA_TELA) {
        iniciarSaida(naTela[0].id);
      }
    },
    [trocarLista, contarTempo, iniciarSaida],
  );

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      {/* top-32 (8rem): limpa o Header (h-16) e o Breadcrumb (sticky top-16) sem encostar.
          pointer-events-none no container (não deve bloquear clique fora do toast em si; só o toast
          individual, mais abaixo, reativa com pointer-events-auto). largura de janela estreita (--largura-janela-estreita) para caber confortável com
          ícone + botão de fechar. items-stretch (não items-center): cada toast ocupa a largura cheia do
          container, senão a barra lateral colorida fica "flutuando" com tamanhos diferentes por toast.
          --camada-aviso: ACIMA dos modais; um aviso disparado de dentro de um modal (ex.: "falta orçamento"
          ao enviar a campanha) ficava escondido atrás dele e a pessoa não sabia se tinha dado certo.
          Sem gap: o espaço entre avisos é a margem de baixo de cada um, dentro do envoltório que encolhe na saída
          (um gap do container pularia de uma vez no fim da animação). */}
      <div className="fixed top-32 left-1/2 -translate-x-1/2 z-(--camada-aviso) flex flex-col items-stretch w-full max-w-(--largura-janela-estreita) px-4 pointer-events-none">
        {toasts.map((toast) => {
          const config = CONFIG_TIPO[toast.tipo];
          return (
            <div
              key={toast.id}
              className={'aviso-envoltorio' + (toast.saindo ? ' aviso-envoltorio--saindo' : '')}
              onTransitionEnd={(evento) => {
                if (toast.saindo && evento.target === evento.currentTarget) {
                  apagar(toast.id);
                }
              }}
            >
              <div>
                <div
                  key={toast.repeticoes}
                  // Leitor de tela: erro é anunciado na hora (alerta); sucesso e aviso, sem interromper (status). O
                  // aviso repetido é montado de novo (`key`), então o leitor anuncia outra vez.
                  role={toast.tipo === 'erro' ? 'alert' : 'status'}
                  className={
                    'pointer-events-auto w-full mb-3 flex fundo-cartao rounded-xl shadow-lg border borda-padrao border-l-4 overflow-hidden ' +
                    config.corBorda +
                    (toast.repeticoes > 0 ? ' aviso-pulso' : '')
                  }
                >
                  <div className="flex-1 flex items-start gap-3 pl-3 pr-2 py-3">
                    <i className={config.icone + ' ' + config.corIcone + ' icone-grande mt-0.5 shrink-0'}></i>
                    {/* Alinhado à esquerda (não centralizado) - texto centralizado
                        numa caixa larga é mais difícil de ler e não é o padrão de
                        painel profissional (Experiment/Catarse usam à esquerda). */}
                    <div className="flex-1 min-w-0 text-left">
                      {/* whitespace-pre-line: a mensagem de conta suspensa/bloqueada embute \n\n para separar a
                          data do "Motivo:" e, sem isto, <p> normal colapsa quebra de linha num espaço só.
                          Inofensivo para todo o resto (só afeta strings que já têm \n de propósito). */}
                      <p className="paragrafo-destaque texto-forte whitespace-pre-line">
                        {toast.titulo}
                      </p>
                      {toast.descricao && (
                        <p className="paragrafo texto-fraco mt-0.5 whitespace-pre-line">
                          {toast.descricao}
                        </p>
                      )}
                    </div>
                    {/* Botão de fechar: erro que a pessoa já leu deveria poder sair na hora, não só esperar o
                        tempo passar. */}
                    <button
                      type="button"
                      onClick={() => iniciarSaida(toast.id)}
                      aria-label="Fechar aviso"
                      className="shrink-0 -mr-1 -mt-1 p-1.5 texto-fraco hover-texto-forte transition-colors"
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
