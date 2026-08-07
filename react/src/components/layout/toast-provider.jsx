import { useCallback, useRef, useState } from 'react';
import { ToastContext } from './toast-context';

// Duração por tipo (pedido do Lucas, 07-08-2026: erro fica 1s a mais que
// sucesso — dá mais tempo pra notar/ler antes de sumir).
const DURACAO_MS = { sucesso: 4000, erro: 5000 };

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

  const mostrar = useCallback((titulo, descricao, tipo = 'sucesso') => {
    const id = proximoId.current++;
    setToasts((atuais) => [...atuais, { id, titulo, descricao, tipo }]);
    setTimeout(() => {
      setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
    }, DURACAO_MS[tipo] ?? DURACAO_MS.sucesso);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      {/* top-32 (8rem, era top-28): pedido do Lucas (07-08-2026) pra descer
          um pouco — ainda limpa o Header (h-16) e o Breadcrumb (sticky
          top-16) sem encostar. pointer-events-none no container (não deve
          bloquear clique fora do toast em si — só o toast individual, mais
          abaixo, reativa com pointer-events-auto). max-w-lg (era max-w-md)
          pra caber o toast de erro maior. */}
      <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 items-center w-full max-w-lg px-4 pointer-events-none">
        {toasts.map((toast) =>
          toast.tipo === 'erro' ? (
            // Estilo separado do de sucesso, de propósito (pedido do Lucas,
            // 07-08-2026): mais claro/translúcido em vez de um bloco
            // vermelho sólido — para AVISAR sem competir com a mensagem
            // vermelha que já existe no formulário (esta é só um empurrão
            // pra notar o erro mais rápido, não a explicação principal).
            // Ajustado de novo no mesmo dia (maior, mais transparente,
            // borda mais escura e mais grossa) depois do 1º teste do Lucas.
            <div
              key={toast.id}
              className="pointer-events-auto w-full px-8 py-6 rounded-xl shadow-xl text-red-900 bg-red-50/60 border-2 border-red-500/80 backdrop-blur-sm"
            >
              <p className="text-lg font-bold text-center">{toast.titulo}</p>
              {toast.descricao && (
                // ERA text-red-800/80 (pedido do Lucas, 07-08-2026: texto
                // claro demais em monitor não calibrado/projetor) — texto
                // agora 100% opaco, só o FUNDO do toast continua translúcido.
                <p className="text-sm font-medium text-red-900 mt-1 text-center">
                  {toast.descricao}
                </p>
              )}
            </div>
          ) : (
            <div
              key={toast.id}
              className="pointer-events-auto w-full px-6 py-4 rounded-xl shadow-2xl text-white bg-primary/90 backdrop-blur-sm"
            >
              <p className="text-base font-bold text-center">{toast.titulo}</p>
              {toast.descricao && (
                <p className="text-sm font-medium text-white mt-1 text-center">
                  {toast.descricao}
                </p>
              )}
            </div>
          ),
        )}
      </div>
    </ToastContext.Provider>
  );
}
