import type { ReactNode } from 'react';

interface CaixaMarcacaoProps {
  rotulo: ReactNode;
  marcado: boolean;
  aoMudar: (marcado: boolean) => void;
  desabilitado?: boolean;
  className?: string;
}

// Caixa de marcação com o rótulo ao lado (clicar no texto também marca).
export function CaixaMarcacao({ rotulo, marcado, aoMudar, desabilitado, className = '' }: CaixaMarcacaoProps) {
  return (
    <label className={'paragrafo-destaque flex items-center gap-2 texto-padrao ' + className}>
      <input
        type="checkbox"
        checked={marcado}
        disabled={desabilitado}
        onChange={(evento) => aoMudar(evento.target.checked)}
      />
      {rotulo}
    </label>
  );
}
