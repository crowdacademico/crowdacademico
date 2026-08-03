import { useCallback, useRef, useState } from 'react';
import { ToastContext } from './toast-context';

const DURACAO_MS = 4000;

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
    }, DURACAO_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      {/* top-28 (7rem): limpa o Header (h-16 = 4rem, sticky top-0) E o
          Breadcrumb (sticky top-16) sem encostar em nenhum dos dois, nas
          páginas onde os dois aparecem juntos. pointer-events-none no
          container (não deve bloquear clique fora do toast em si — só o
          toast individual, mais abaixo, reativa com pointer-events-auto). */}
      <div className="fixed top-28 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 items-center w-full max-w-md px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              'pointer-events-auto w-full px-6 py-4 rounded-xl shadow-2xl text-white backdrop-blur-sm ' +
              (toast.tipo === 'erro' ? 'bg-red-600/90' : 'bg-primary/90')
            }
          >
            <p className="text-base font-bold text-center">{toast.titulo}</p>
            {toast.descricao && (
              <p className="text-sm font-medium text-white/85 mt-1 text-center">
                {toast.descricao}
              </p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
