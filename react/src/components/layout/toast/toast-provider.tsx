import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from './toast-context';
import type { TipoToast } from './toast-context';

// Duração por tipo: erro fica 1s a mais que sucesso (mais tempo para notar/ler antes de sumir).
const DURACAO_MS: Record<TipoToast, number> = { sucesso: 4000, erro: 5000 };

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
  const proximoId = useRef(0);

  const remover = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
  }, []);

  const mostrar = useCallback(
    (titulo: string, descricao?: string, tipo: TipoToast = 'sucesso') => {
      const id = proximoId.current++;
      // Aviso idêntico ao que já está na tela não empilha de novo (o <StrictMode> do desenvolvimento dispara cada efeito
      // duas vezes e o mesmo erro chegava em dobro).
      setToasts((atuais) =>
        atuais.some((t) => t.titulo === titulo && t.descricao === descricao && t.tipo === tipo)
          ? atuais
          : [...atuais, { id, titulo, descricao, tipo }],
      );
      setTimeout(() => remover(id), DURACAO_MS[tipo]);
    },
    [remover],
  );

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      {/* top-32 (8rem): limpa o Header (h-16) e o Breadcrumb (sticky top-16) sem encostar.
          pointer-events-none no container (não deve bloquear clique fora do toast em si; só o toast
          individual, mais abaixo, reativa com pointer-events-auto). max-w-lg para caber confortável com
          ícone + botão de fechar. items-stretch (não items-center): cada toast ocupa a largura cheia do
          container, senão a barra lateral colorida fica "flutuando" com tamanhos diferentes por toast. */}
      <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 items-stretch w-full max-w-lg px-4 pointer-events-none">
        {toasts.map((toast) => {
          const config = CONFIG_TIPO[toast.tipo];
          return (
            <div
              key={toast.id}
              className={
                'pointer-events-auto w-full flex fundo-cartao rounded-xl shadow-lg border borda-padrao border-l-4 overflow-hidden ' +
                config.corBorda
              }
            >
              <div className="flex-1 flex items-start gap-3 pl-3 pr-2 py-3">
                <i className={config.icone + ' ' + config.corIcone + ' text-lg mt-0.5 shrink-0'}></i>
                {/* Alinhado à esquerda (não centralizado) - texto centralizado
                    numa caixa larga é mais difícil de ler e não é o padrão de
                    painel profissional (Experiment/Catarse usam à esquerda). */}
                <div className="flex-1 min-w-0 text-left">
                  {/* whitespace-pre-line: a mensagem de conta suspensa/bloqueada embute \n\n para separar a
                      data do "Motivo:" e, sem isto, <p> normal colapsa quebra de linha num espaço só.
                      Inofensivo para todo o resto (só afeta strings que já têm \n de propósito). */}
                  <p className="text-sm font-bold texto-forte whitespace-pre-line">
                    {toast.titulo}
                  </p>
                  {toast.descricao && (
                    <p className="text-sm texto-fraco mt-0.5 whitespace-pre-line">
                      {toast.descricao}
                    </p>
                  )}
                </div>
                {/* Botão de fechar: erro que a pessoa já leu deveria poder sair na hora, não só esperar o
                    tempo passar (5s no erro). */}
                <button
                  type="button"
                  onClick={() => remover(toast.id)}
                  aria-label="Fechar aviso"
                  className="shrink-0 -mr-1 -mt-1 p-1.5 texto-fraco hover-texto-forte transition-colors"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
