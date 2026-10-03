import { useRef, useState } from 'react';
import { useFecharAoClicarFora } from '../../services/constant/hook/use-fechar-ao-clicar-fora';

// Busca de texto + 1+ dropdowns de faceta, compartilhada por `generic-table.tsx` e pelas bancadas
// (`bancada-campanha.tsx`/`bancada-pesquisador.tsx`, que não podem usar `GenericTable` por causa do
// risco de linha): pelo teste-de-prop de `generic-table.tsx`, é um IRMÃO, não um miolo.
//
// CONTROLADO, sem opinião de onde o valor/seleção mora (`GenericTable` guarda na URL, as bancadas em `useState`
// local): `aoMudarBusca`/`aoAlternar`/`aoLimpar` recebem só o valor final, quem chama decide como persistir. A
// ÚNICA coisa que este componente decide por conta própria é qual dropdown de faceta está aberto (estado de UI
// pura, não filtro).
//
// 2 comportamentos preservados byte a byte (foram depurados ao vivo, não são "só estilo"):
// 1) clique no TEXTO do <label> chama alternar() + preventDefault(); clique DIRETO no checkbox deixa o onChange
// nativo agir (senão alterna 2x).
// 2) fechar por mousedown no document comparando com contains(), NUNCA por onBlur/relatedTarget (checkbox
// dentro de <label> dispara blur antes do clique completar, fechando o dropdown na hora errada).
//
// Chips: cada filtro ativo (texto da busca e cada opção marcada) vira um chip com X logo abaixo da barra, para
// ver de relance o que está filtrando a lista e tirar um filtro só sem abrir o dropdown. Saem das mesmas props
// (`aoMudarBusca('')`, `aoAlternar(opcao)`), então toda tela que usa a barra ganha os chips sem mudar nada.
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
  // "Limpar filtros" numa atualização só. Sem isto, chama aoMudarBusca('') + aoLimpar de cada faceta em
  // sequência, o que serve a estado local (useState) mas perde atualizações na URL: setSearchParams recebe os
  // parâmetros do último render, não os da chamada anterior.
  aoLimparTudo?: () => void;
}

export function BarraFiltros({
  mostrarBusca,
  valorBusca,
  aoMudarBusca,
  placeholderBusca = 'Filtrar...',
  facetas,
  aoLimparTudo,
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

  const chips = [
    ...(mostrarBusca && valorBusca.trim()
      ? [{ chave: 'busca', texto: `Busca: "${valorBusca.trim()}"`, remover: () => aoMudarBusca('') }]
      : []),
    ...facetasComOpcoes.flatMap((faceta) =>
      faceta.selecionados.map((opcao) => ({
        chave: `${faceta.chave}:${opcao}`,
        texto: `${faceta.rotulo}: ${faceta.rotulos?.[opcao] ?? opcao}`,
        remover: () => faceta.aoAlternar(opcao),
      })),
    ),
  ];
  const limparTudo = aoLimparTudo ?? (() => {
    if (mostrarBusca) aoMudarBusca('');
    facetasComOpcoes.forEach((faceta) => {
      if (faceta.selecionados.length > 0) faceta.aoLimpar();
    });
  });

  return (
    <div className="mb-3">
      <div className="flex items-center gap-3 flex-wrap">
        {mostrarBusca && (
          <input
            type="search"
            placeholder={placeholderBusca}
            value={valorBusca}
            onChange={(evento) => aoMudarBusca(evento.target.value)}
            // py-2.5: mesma altura do botão de filtro ao lado (.btn), para a barra (e a tabela abaixo) ficar na
            // mesma altura com ou sem filtro de lista.
            className="paragrafo w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2.5 px-3 outline-none foco-marca texto-herdado"
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
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <i className="fa-solid fa-filter" aria-hidden="true"></i>
                    {faceta.rotulo}
                    {faceta.selecionados.length > 0 ? (
                      <span className="badge badge-sucesso">{faceta.selecionados.length}</span>
                    ) : (
                      <span className="paragrafo texto-padrao">(Todos)</span>
                    )}
                    <i className="fa-solid fa-chevron-down icone-pequeno" aria-hidden="true"></i>
                  </button>

                  {aberta && (
                    <div className="absolute left-0 mt-1 w-56 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
                      <button type="button" onClick={faceta.aoLimpar} className="dropdown-opcao">
                        Todos
                        {faceta.selecionados.length === 0 && (
                          <i className="fa-solid fa-check texto-sucesso" aria-hidden="true"></i>
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

      {chips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {chips.map((chip) => (
            <button
              key={chip.chave}
              type="button"
              onClick={chip.remover}
              aria-label={`Remover filtro ${chip.texto}`}
              className="badge badge-neutro gap-1.5 foco-marca"
            >
              {chip.texto}
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          ))}
          {chips.length > 1 && (
            <button type="button" onClick={limparTudo} className="legenda-destaque texto-marca foco-marca">
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
