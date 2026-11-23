import { useState } from 'react';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { useDuvidasFrequentes } from './use-duvidas-frequentes';

// Todas as perguntas vêm de use-duvidas-frequentes.tsx (a Home usa a mesma fonte).
//
// Dois modos (22-11-2026), com o mesmo botão de "grade e lista" do Explorar: em lista (o padrão), uma pergunta embaixo
// da outra; lado a lado, duas colunas a partir de 1024 px. As colunas são independentes (a 1ª metade das perguntas
// numa, a 2ª na outra): numa grade por linhas, abrir uma pergunta empurrava a vizinha da outra coluna junto. Abaixo de
// 1024 px o botão some e fica sempre em lista.
export function PerguntasFrequentes() {
  const duvidas = useDuvidasFrequentes();
  const [ladoALado, setLadoALado] = useState(false);

  const metade = Math.ceil(duvidas.length / 2);
  const colunas = ladoALado ? [duvidas.slice(0, metade), duvidas.slice(metade)] : [duvidas];

  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="largura-site w-full">
        {/* Largura única da área pública (DSP-34, 22-11-2026): o trilho inteiro. */}
        <CabecalhoPagina
          className="mb-10"
          titulo="Perguntas frequentes"
          descricao="O que mais perguntam sobre apoiar, acompanhar e submeter pesquisas no CrowdAcadêmico."
          acaoTitulo={
            <div
              className="hidden shrink-0 items-center lg:flex border borda-padrao rounded-lg overflow-hidden"
              role="group"
              aria-label="Modo de exibição"
            >
              <button
                aria-label="Ver lado a lado"
                aria-pressed={ladoALado}
                className={`w-9 h-9 flex items-center justify-center ${ladoALado ? 'fundo-realce texto-forte' : ''}`}
                onClick={() => setLadoALado(true)}
                type="button"
              >
                <i className="fa-solid fa-grip" aria-hidden="true" />
              </button>
              <button
                aria-label="Ver em lista"
                aria-pressed={!ladoALado}
                className={`w-9 h-9 flex items-center justify-center ${ladoALado ? '' : 'fundo-realce texto-forte'}`}
                onClick={() => setLadoALado(false)}
                type="button"
              >
                <i className="fa-solid fa-list" aria-hidden="true" />
              </button>
            </div>
          }
        />
        <div className={ladoALado ? 'grid grid-cols-1 items-start gap-3 lg:grid-cols-2' : undefined}>
          {colunas.map((coluna, indice) => (
            <div key={indice} className="flex flex-col gap-3">
              {coluna.map((duvida) => (
                <details key={duvida.chave} className="pagina-publica__faq">
                  <summary>{duvida.pergunta}</summary>
                  <p className="paragrafo texto-padrao">{duvida.resposta}</p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
