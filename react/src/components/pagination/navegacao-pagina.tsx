// Extraído (23-09-2026) - o núcleo "Página X de Y (N registros) / Anterior /
// Próxima" de RodapePaginacao (que também tem o <select> de tamanho) era
// reescrito à mão em log-auditoria-painel.tsx (paginação server-side, sem
// seletor de tamanho) - mesmo raciocínio de irmão/miolo que já levou à
// extração de RodapePaginacao: o texto e os 2 botões são o miolo comum,
// `children` é onde cada chamador encaixa controles extras (ex.: o <select>
// de tamanho do RodapePaginacao).
import type { ReactNode } from 'react';

interface NavegacaoPaginaProps {
  total: number;
  paginaAtual: number;
  totalPaginas: number;
  aoMudarPagina: (pagina: number) => void;
  unidade?: string;
  children?: ReactNode;
  className?: string;
}

export function NavegacaoPagina({
  total,
  paginaAtual,
  totalPaginas,
  aoMudarPagina,
  unidade = 'registros',
  children,
  className,
}: NavegacaoPaginaProps) {
  return (
    <div
      className={
        'flex items-center justify-between flex-wrap gap-3 mt-3 text-sm texto-padrao' +
        (className ? ' ' + className : '')
      }
    >
      <span>
        Página {paginaAtual} de {totalPaginas} ({total} {unidade})
      </span>
      <div className="flex items-center gap-3">
        {children}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => aoMudarPagina(Math.max(1, paginaAtual - 1))}
            disabled={paginaAtual === 1}
            className="btn btn-secondary"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => aoMudarPagina(Math.min(totalPaginas, paginaAtual + 1))}
            disabled={paginaAtual === totalPaginas}
            className="btn btn-secondary"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
