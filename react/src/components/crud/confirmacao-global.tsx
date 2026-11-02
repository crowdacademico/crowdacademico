import { useEffect, useState } from 'react';
import { registrarConfirmacaoGlobal, type PedidoConfirmacao } from './confirmacao';
import { ModalConfirmacao } from './modal-confirmacao';

interface PedidoAberto {
  pedido: PedidoConfirmacao;
  responder: (confirmou: boolean) => void;
}

// A janela de pedirConfirmacao() (confirmacao.ts): montada uma vez, em main.tsx, e reaproveitada por todo pedido.
export function ConfirmacaoGlobal() {
  const [aberto, setAberto] = useState<PedidoAberto | null>(null);

  useEffect(() => {
    registrarConfirmacaoGlobal((pedido, responder) => setAberto({ pedido, responder }));
    return () => registrarConfirmacaoGlobal(null);
  }, []);

  if (!aberto) return null;
  const encerrar = (confirmou: boolean) => {
    aberto.responder(confirmou);
    setAberto(null);
  };
  return (
    <ModalConfirmacao
      titulo={aberto.pedido.titulo}
      rotuloConfirmar={aberto.pedido.rotuloConfirmar}
      perigo={aberto.pedido.perigo}
      aoConfirmar={() => encerrar(true)}
      aoCancelar={() => encerrar(false)}
    >
      {aberto.pedido.texto}
    </ModalConfirmacao>
  );
}
