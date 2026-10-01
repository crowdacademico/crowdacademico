// O núcleo "Página X de Y (N registros) / Anterior / números / Próxima" de RodapePaginacao (que também tem o
// <select> de tamanho), reutilizado em log-auditoria-painel.tsx (paginação server-side, sem seletor de tamanho):
// mesmo raciocínio de irmão/miolo de RodapePaginacao. `children` é onde cada chamador encaixa controles extras
// (ex.: o <select> de tamanho do RodapePaginacao).
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

type ItemPagina = number | 'reticencias-inicio' | 'reticencias-fim';

// Paginação truncada (padrão de GOV.UK, Material UI e Ant Design): a primeira e a última página aparecem sempre
// (é o "ir para o começo/fim", sem botões "Primeira"/"Última"), mais a atual e uma vizinha de cada lado; o resto
// vira "…". Sempre 7 posições (ex.: 1 … 6 [7] 8 … 20; perto das pontas, 1 2 3 4 5 … 20), para os botões não
// pularem de lugar ao trocar de página. Com até 7 páginas, aparecem todas. Mesmo cálculo do Material UI (uma
// página fixa em cada ponta, uma vizinha de cada lado).
function itensDaPaginacao(paginaAtual: number, totalPaginas: number): ItemPagina[] {
  if (totalPaginas <= 7) {
    return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);
  }
  const inicioVizinhas = Math.max(Math.min(paginaAtual - 1, totalPaginas - 4), 3);
  const fimVizinhas = Math.min(Math.max(paginaAtual + 1, 5), totalPaginas - 2);
  const meio = Array.from({ length: fimVizinhas - inicioVizinhas + 1 }, (_, indice) => inicioVizinhas + indice);
  return [
    1,
    inicioVizinhas > 3 ? 'reticencias-inicio' : 2,
    ...meio,
    fimVizinhas < totalPaginas - 2 ? 'reticencias-fim' : totalPaginas - 1,
    totalPaginas,
  ];
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
  const itens = itensDaPaginacao(paginaAtual, totalPaginas);

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
      {/* flex-wrap: no celular (375px) o seletor de tamanho, os números e os 2 botões não cabem numa linha; sem
          quebrar, a página inteira passava da largura da tela. */}
      <div className="flex items-center flex-wrap gap-3">
        {children}
        <nav aria-label="Paginação" className="flex items-center flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => aoMudarPagina(Math.max(1, paginaAtual - 1))}
            disabled={paginaAtual === 1}
            className="btn btn-secondary"
          >
            Anterior
          </button>
          {itens.map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                onClick={() => aoMudarPagina(item)}
                aria-label={`Página ${item}`}
                aria-current={item === paginaAtual ? 'page' : undefined}
                className={
                  'btn min-w-10 px-2 ' +
                  (item === paginaAtual ? 'btn-primary' : 'btn-secondary') +
                  // Celular: só a primeira, a atual e a última (1 … [7] … 20); as vizinhas voltam a partir do sm.
                  (item !== 1 && item !== totalPaginas && item !== paginaAtual ? ' hidden sm:inline-flex' : '')
                }
              >
                {item}
              </button>
            ) : (
              <span key={item} className="px-1 texto-fraco select-none" aria-hidden="true">
                …
              </span>
            ),
          )}
          <button
            type="button"
            onClick={() => aoMudarPagina(Math.min(totalPaginas, paginaAtual + 1))}
            disabled={paginaAtual === totalPaginas}
            className="btn btn-secondary"
          >
            Próxima
          </button>
        </nav>
      </div>
    </div>
  );
}
