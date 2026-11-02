import type { ReactNode } from 'react';

export interface PedidoConfirmacao {
  titulo: string;
  // O que acontece se confirmar, em texto simples.
  texto?: ReactNode;
  rotuloConfirmar: string;
  perigo?: boolean;
}

type Abrir = (pedido: PedidoConfirmacao, responder: (confirmou: boolean) => void) => void;
let abrir: Abrir | null = null;

// Quem mostra a janela é o <ConfirmacaoGlobal /> (main.tsx), montado uma vez só; ele se registra aqui.
export function registrarConfirmacaoGlobal(funcao: Abrir | null): void {
  abrir = funcao;
}

// O ModalConfirmacao para quem precisa de um sim ou não no meio de uma função, como era o window.confirm do
// navegador (que ignora o tema e o A-/A+): `if (!(await pedirConfirmacao({...}))) return;`.
export function pedirConfirmacao(pedido: PedidoConfirmacao): Promise<boolean> {
  return new Promise((responder) => {
    if (!abrir) {
      console.error('pedirConfirmacao: <ConfirmacaoGlobal /> não está montado.');
      responder(false);
      return;
    }
    abrir(pedido, responder);
  });
}
