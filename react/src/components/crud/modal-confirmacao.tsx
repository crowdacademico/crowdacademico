import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocoPreso } from '../../services/constant/hook/use-foco-preso';
import { CaixaMarcacao } from '../input/caixa-marcacao';
import { RodapeAcoes } from './rodape-acoes';

interface ModalConfirmacaoProps {
  titulo: string;
  // As consequências, em texto simples: o que acontece se confirmar.
  children: ReactNode;
  rotuloConfirmar: string;
  rotuloOcupado?: string;
  perigo?: boolean;
  ocupado?: boolean;
  // Decisão crítica: o Confirmar só libera depois de marcar "Li e entendo as consequências".
  exigirCiencia?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

// Janelinha de confirmação para decisão humana que pesa (ex.: recusar ou aceitar uma contestação): abre por cima da
// janela atual, diz o que vai acontecer e pede o OK; com `exigirCiencia`, também a caixinha de ciência marcada. Vai para o fim do <body> (portal) para ficar sempre por cima,
// e o Esc fecha só ela (useFocoPreso).
export function ModalConfirmacao({
  titulo,
  children,
  rotuloConfirmar,
  rotuloOcupado,
  perigo = false,
  ocupado = false,
  exigirCiencia = false,
  aoConfirmar,
  aoCancelar,
}: ModalConfirmacaoProps) {
  const idTitulo = useId();
  const janelaRef = useRef<HTMLDivElement>(null);
  useFocoPreso(janelaRef, true, aoCancelar);
  const [ciente, setCiente] = useState(false);
  return createPortal(
    <div
      className="fixed inset-0 z-(--camada-modal) flex items-start justify-center px-4 pt-(--distancia-topo-modal) pb-4 fundo-escurecido"
      onClick={aoCancelar}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) evento.preventDefault();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        ref={janelaRef}
        tabIndex={-1}
        className="outline-none w-full max-w-(--largura-janela-estreita) fundo-elevado rounded-2xl shadow-2xl border borda-forte overflow-hidden"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="px-6 py-4 border-b borda-padrao">
          <h2 id={idTitulo} className="paragrafo-destaque">
            {titulo}
          </h2>
        </div>
        <div className="px-6 py-4 paragrafo space-y-2">
          {children}
          {exigirCiencia && (
            <CaixaMarcacao className="pt-2" rotulo="Li e entendo as consequências." marcado={ciente} aoMudar={setCiente} />
          )}
        </div>
        <div className="px-6 py-4 border-t borda-padrao">
          <RodapeAcoes
            aoCancelar={aoCancelar}
            rotuloCancelar="Voltar"
            acao={{ rotulo: rotuloConfirmar, rotuloOcupado, ocupado, perigo, desabilitado: exigirCiencia && !ciente, aoClicar: aoConfirmar }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
