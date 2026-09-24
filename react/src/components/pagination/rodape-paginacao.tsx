// Extraído (14-09-2026, revisão do Lucas) - o rodapé "Página X de
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
//
// Compõe NavegacaoPagina (23-09-2026) - o "Página X de Y / Anterior /
// Próxima" é o mesmo miolo que log-auditoria-painel.tsx precisava (esse sem
// seletor de tamanho); o <select> de tamanho abaixo entra como `children`.
import { NavegacaoPagina } from './navegacao-pagina';
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
    <NavegacaoPagina
      total={total}
      paginaAtual={paginaAtual}
      totalPaginas={totalPaginas}
      aoMudarPagina={aoMudarPagina}
      className={className}
    >
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
    </NavegacaoPagina>
  );
}
