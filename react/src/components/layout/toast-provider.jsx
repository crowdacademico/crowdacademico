import { useCallback, useRef, useState } from 'react';
import { ToastContext } from './toast-context';

// Duração por tipo (pedido do Lucas, 07-08-2026: erro fica 1s a mais que
// sucesso — dá mais tempo pra notar/ler antes de sumir).
const DURACAO_MS = { sucesso: 4000, erro: 5000 };

// Redesenho (08-08-2026, rodada Experiment.com/Catarse): sucesso e erro
// tinham estruturas DIFERENTES (sucesso era um bloco verde sólido com
// texto branco; erro era translúcido com borda vermelha grossa) — cada um
// evoluído em rodada separada, sem desenho conjunto. Unificados na mesma
// estrutura (cartão branco + barra colorida de 4px na esquerda + ícone) —
// a cor vira ACENTO (a barra/ícone), não fundo. Texto sempre escuro
// (nunca branco sobre colorido) resolve de vez o problema de legibilidade
// em monitor não calibrado já relatado antes pro toast de erro.
const CONFIG_TIPO = {
  sucesso: {
    corBarra: 'bg-emerald-500',
    corIcone: 'texto-sucesso',
    icone: 'fa-solid fa-circle-check',
  },
  erro: {
    corBarra: 'bg-red-500',
    corIcone: 'texto-erro',
    icone: 'fa-solid fa-circle-exclamation',
  },
};

// Confirmação visual reaproveitável — pedida pro fluxo de criar usuário,
// mas pensada pra servir alterar/consultar/excluir também (e qualquer
// módulo futuro): qualquer componente chama `useToast().mostrar(titulo,
// descricao, tipo)` (ver use-toast.js), não precisa saber onde o toast é
// desenhado nem gerenciar timeout sozinho.
//
// Duas linhas de propósito (pedido do Lucas, 03-08-2026): "Usuário 18
// alterado com sucesso." de uma vez só não deixava claro nem A AÇÃO nem O
// ID — título grande e curto ("Usuário alterado com sucesso.") e uma
// descrição menor embaixo com o dado específico ("ID: 18 foi alterado").
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const proximoId = useRef(0);

  const remover = useCallback((id) => {
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
  }, []);

  const mostrar = useCallback(
    (titulo, descricao, tipo = 'sucesso') => {
      const id = proximoId.current++;
      setToasts((atuais) => [...atuais, { id, titulo, descricao, tipo }]);
      setTimeout(() => remover(id), DURACAO_MS[tipo] ?? DURACAO_MS.sucesso);
    },
    [remover],
  );

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      {/* top-32 (8rem): pedido do Lucas (07-08-2026) pra descer um pouco —
          ainda limpa o Header (h-16) e o Breadcrumb (sticky top-16) sem
          encostar. pointer-events-none no container (não deve bloquear
          clique fora do toast em si — só o toast individual, mais abaixo,
          reativa com pointer-events-auto). max-w-lg pra caber confortável
          com ícone + botão de fechar. items-stretch (não items-center):
          cada toast ocupa a largura cheia do container, senão a barra
          lateral colorida fica "flutuando" com tamanhos diferentes por
          toast. */}
      <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 items-stretch w-full max-w-lg px-4 pointer-events-none">
        {toasts.map((toast) => {
          const config = CONFIG_TIPO[toast.tipo] ?? CONFIG_TIPO.sucesso;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto w-full flex fundo-cartao rounded-xl shadow-lg border borda-padrao overflow-hidden"
            >
              <div className={'w-1 shrink-0 ' + config.corBarra}></div>
              <div className="flex-1 flex items-start gap-3 pl-3 pr-2 py-3">
                <i className={config.icone + ' ' + config.corIcone + ' text-lg mt-0.5 shrink-0'}></i>
                {/* Alinhado à esquerda (não centralizado) — texto centralizado
                    numa caixa larga é mais difícil de ler e não é o padrão de
                    painel profissional (Experiment/Catarse usam à esquerda). */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold texto-forte">{toast.titulo}</p>
                  {toast.descricao && (
                    <p className="text-sm texto-fraco mt-0.5">{toast.descricao}</p>
                  )}
                </div>
                {/* Botão de fechar — pedido do Lucas, 08-08-2026: erro que a
                    pessoa já leu deveria poder sair na hora, não só esperar o
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
