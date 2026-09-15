import { useRef, useState } from 'react';
import { useFecharAoClicarFora } from '../../services/constant/hook/use-fechar-ao-clicar-fora';

// Extraído (14-09-2026, contra-prompt Claude Web) - busca de texto + 1+
// dropdowns de faceta, reescrito à mão em `bancada-campanha.tsx`/
// `bancada-pesquisador.tsx` (Campo de Testes, não podem usar `GenericTable`
// por causa do risco de linha) além do original em `generic-table.tsx` -
// pelo teste-de-prop de `generic-table.tsx`, é um IRMÃO, não um miolo.
//
// CONTROLADO, sem opinião de onde o valor/seleção mora (`GenericTable`
// guarda na URL, as bancadas em `useState` local) - `aoMudarBusca`/
// `aoAlternar`/`aoLimpar` recebem só o valor final, quem chama decide como
// persistir. A ÚNICA coisa que este componente decide por conta própria é
// qual dropdown de faceta está aberto (estado de UI pura, não filtro).
//
// 2 comportamentos preservados byte a byte - já foram depurados ao vivo,
// custaram tempo de debug, não são "só estilo":
// 1) clique no TEXTO do <label> chama alternar() + preventDefault(); clique
//    DIRETO no checkbox deixa o onChange nativo agir (senão alterna 2x).
// 2) fechar por mousedown no document comparando com contains(), NUNCA por
//    onBlur/relatedTarget (checkbox dentro de <label> dispara blur antes do
//    clique completar, fechando o dropdown na hora errada).
export interface FacetaFiltro {
  chave: string;
  rotulo: string;
  opcoes: string[];
  selecionados: string[];
  rotulos?: Record<string, string>;
  aoAlternar: (opcao: string) => void;
  aoLimpar: () => void;
}

interface BarraFiltrosProps {
  mostrarBusca: boolean;
  valorBusca: string;
  aoMudarBusca: (valor: string) => void;
  placeholderBusca?: string;
  facetas?: FacetaFiltro[];
}

export function BarraFiltros({
  mostrarBusca,
  valorBusca,
  aoMudarBusca,
  placeholderBusca = 'Filtrar...',
  facetas,
}: BarraFiltrosProps) {
  // Cada faceta só aparece se tiver mais de 1 valor possível (com 1 só,
  // filtrar não faria diferença nenhuma).
  const facetasComOpcoes = (facetas ?? []).filter((faceta) => faceta.opcoes.length > 1);
  // Só 1 dropdown aberto por vez, ref cobre TODAS juntas - clicar no botão
  // de uma enquanto outra está aberta só troca qual está aberta, não fecha
  // as duas.
  const [facetaAbertaChave, setFacetaAbertaChave] = useState<string | null>(null);
  const facetasRef = useRef<HTMLDivElement>(null);
  useFecharAoClicarFora(facetasRef, facetaAbertaChave !== null, () => setFacetaAbertaChave(null));

  if (!mostrarBusca && facetasComOpcoes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 flex-wrap mb-3">
      {mostrarBusca && (
        <input
          type="search"
          placeholder={placeholderBusca}
          value={valorBusca}
          onChange={(evento) => aoMudarBusca(evento.target.value)}
          className="w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2 px-3 text-sm outline-none foco-marca"
        />
      )}

      {facetasComOpcoes.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap" ref={facetasRef}>
          {facetasComOpcoes.map((faceta) => {
            const aberta = facetaAbertaChave === faceta.chave;

            return (
              <div key={faceta.chave} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setFacetaAbertaChave((atual) => (atual === faceta.chave ? null : faceta.chave))
                  }
                  className="btn btn-secondary text-sm flex items-center gap-2"
                >
                  <i className="fa-solid fa-filter"></i>
                  {faceta.rotulo}
                  {faceta.selecionados.length > 0 ? (
                    <span className="badge badge-sucesso">{faceta.selecionados.length}</span>
                  ) : (
                    <span className="texto-fraco font-normal">(Todos)</span>
                  )}
                  <i className="fa-solid fa-chevron-down text-xs"></i>
                </button>

                {aberta && (
                  <div className="absolute left-0 mt-1 w-56 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                    <button type="button" onClick={faceta.aoLimpar} className="dropdown-opcao">
                      Todos
                      {faceta.selecionados.length === 0 && (
                        <i className="fa-solid fa-check texto-sucesso"></i>
                      )}
                    </button>
                    <div className="max-h-64 overflow-y-auto">
                      {faceta.opcoes.map((opcao) => {
                        const marcado = faceta.selecionados.includes(opcao);
                        const alternar = () => faceta.aoAlternar(opcao);
                        return (
                          <label
                            key={opcao}
                            className="combobox-opcao"
                            onClick={(evento) => {
                              if (evento.target instanceof Element && evento.target.tagName !== 'INPUT') {
                                evento.preventDefault();
                                alternar();
                              }
                            }}
                          >
                            <input type="checkbox" checked={marcado} onChange={alternar} />
                            {faceta.rotulos?.[opcao] ?? opcao}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
