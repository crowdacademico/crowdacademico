// Extraído (14-09-2026, contra-prompt Claude Web) - o rodapé "Página X de
// Y / Mostrar / Anterior / Próxima" era reescrito inteiro em 4 lugares
// (`generic-table.tsx`, `bancada-campanha.tsx`, `bancada-pesquisador.tsx`,
// `registro-chamadas.tsx`) porque as bancadas do Campo de Testes não podem
// usar `GenericTable` (risco de linha), mas precisavam do MESMO rodapé -
// pelo teste-de-prop de `generic-table.tsx`, isso é um IRMÃO, não um miolo.
//
// Controlado, sem opinião sobre ONDE o estado de página/tamanho mora -
// `GenericTable` guarda isso na URL (`useSearchParams`), as bancadas usam
// `useState` local; `aoMudarPagina`/`aoMudarTamanho` recebem só o valor
// final (página de destino, tamanho escolhido), cada chamador decide como
// persistir (ex.: `pagina === 1 ? null : pagina` pra manter a URL limpa).
import { TAMANHOS_PAGINA } from './tamanhos-pagina.constants';
import type { TamanhoPagina } from './tamanhos-pagina.constants';

interface RodapePaginacaoProps {
  total: number;
  paginaAtual: number;
  totalPaginas: number;
  tamanhoPagina: TamanhoPagina;
  aoMudarPagina: (pagina: number) => void;
  aoMudarTamanho: (tamanho: TamanhoPagina) => void;
  className?: string;
}

export function RodapePaginacao({
  total,
  paginaAtual,
  totalPaginas,
  tamanhoPagina,
  aoMudarPagina,
  aoMudarTamanho,
  className,
}: RodapePaginacaoProps) {
  // Só aparece com mais registros que o menor tamanho de página - com
  // tudo cabendo numa página só, o rodapé é ruído puro.
  if (total <= TAMANHOS_PAGINA[0]) {
    return null;
  }

  return (
    <div
      className={
        'flex items-center justify-between flex-wrap gap-3 mt-3 text-sm texto-padrao' +
        (className ? ' ' + className : '')
      }
    >
      <span>
        Página {paginaAtual} de {totalPaginas} ({total} registros)
      </span>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold texto-padrao">
          Mostrar
          <select
            value={tamanhoPagina}
            onChange={(evento) => {
              const valor = evento.target.value;
              aoMudarTamanho(valor === 'todos' ? 'todos' : Number(valor));
            }}
            className="border borda-padrao rounded-md fundo-sutil py-1 px-2 text-xs outline-none foco-marca"
          >
            {TAMANHOS_PAGINA.map((tamanho) => (
              <option key={tamanho} value={tamanho}>
                {tamanho === 'todos' ? 'Todos' : tamanho}
              </option>
            ))}
          </select>
        </label>
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
