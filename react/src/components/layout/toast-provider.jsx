import { useCallback, useRef, useState } from 'react';
import { ToastContext } from './toast-context';

const DURACAO_MS = 4000;

// Confirmação visual reaproveitável — pedida pro fluxo de criar usuário,
// mas pensada pra servir alterar/consultar/excluir também (e qualquer
// módulo futuro): qualquer componente chama `useToast().mostrar(...)`
// (ver use-toast.js), não precisa saber onde o toast é desenhado nem
// gerenciar timeout sozinho.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const proximoId = useRef(0);

  const mostrar = useCallback((mensagem, tipo = 'sucesso') => {
    const id = proximoId.current++;
    setToasts((atuais) => [...atuais, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
    }, DURACAO_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={
              'px-5 py-3 rounded-lg shadow-xl text-sm font-semibold text-white ' +
              (toast.tipo === 'erro' ? 'bg-red-600' : 'bg-primary')
            }
          >
            {toast.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
