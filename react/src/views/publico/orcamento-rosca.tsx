import { useEffect, useState } from 'react';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { OrcamentoCampanhaResponse } from '../../services/13-orcamento-campanha/type/orcamento-campanha.type';

// RF-047: o orçamento da campanha como rosca de progresso segmentada (18-11-2026, ideia do Lucas). Cada fatia é uma
// categoria, da mais barata para a mais cara, com as 8 cores fixas da paleta de séries (--serie-1 a --serie-8,
// validadas para daltonismo nos dois temas). A rosca inteira fica apagada, e o arrecadado "acende" as fatias a partir
// do topo, no sentido horário: fatia toda percorrida = item coberto; a fatia onde o arrecadado parou acende até ali.
// Uma bolinha marca a ponta. Ao abrir, a ponta corre de 0 até o valor (sem animação com "reduzir movimento").
// A cor nunca fica sozinha: a legenda ESCREVE nome, valor, percentual acumulado e a situação (coberto, quanto falta).
// Passando de 8 categorias, as mais baratas se juntam em "Outras", no fim.
const MAX_FATIAS = 8;
const RAIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
const DURACAO_MS = 1100;

interface Grupo {
  total: number;
  itens: OrcamentoCampanhaResponse[];
}

function agruparPorCategoria(itens: OrcamentoCampanhaResponse[]): [string, Grupo][] {
  const porCategoria = new Map<string, Grupo>();
  for (const item of itens) {
    const chave = item.categoria.trim();
    const grupo = porCategoria.get(chave) ?? { total: 0, itens: [] };
    grupo.total += item.valor;
    grupo.itens.push(item);
    porCategoria.set(chave, grupo);
  }
  const ordenadas = [...porCategoria.entries()].sort((a, b) => a[1].total - b[1].total);
  if (ordenadas.length <= MAX_FATIAS) return ordenadas;
  const corte = ordenadas.length - (MAX_FATIAS - 1);
  const resto = ordenadas.slice(0, corte);
  const outras: Grupo = {
    total: resto.reduce((soma, [, grupo]) => soma + grupo.total, 0),
    itens: resto.flatMap(([, grupo]) => grupo.itens),
  };
  return [...ordenadas.slice(corte), ['Outras', outras]];
}

// Vai de 0 até `alvo` (0 a 1) em DURACAO_MS, com desaceleração no fim. Com "reduzir movimento", já começa no alvo.
function useProgressoAnimado(alvo: number): number {
  const reduzir = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [valor, setValor] = useState(reduzir ? alvo : 0);
  useEffect(() => {
    if (reduzir) {
      const quadro = requestAnimationFrame(() => setValor(alvo));
      return () => cancelAnimationFrame(quadro);
    }
    let quadro = 0;
    const comeco = performance.now();
    const passo = (agora: number) => {
      const t = Math.min((agora - comeco) / DURACAO_MS, 1);
      setValor(alvo * (1 - Math.pow(1 - t, 3)));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, reduzir]);
  return valor;
}

export function OrcamentoRosca({ itens, meta, arrecadado }: { itens: OrcamentoCampanhaResponse[]; meta: number; arrecadado: number }) {
  const categorias = agruparPorCategoria(itens);
  const soma = categorias.reduce((total, [, grupo]) => total + grupo.total, 0);
  const base = meta > 0 ? meta : soma;
  const PERCENTUAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const percentual = (valor: number) => (base > 0 ? (valor / base) * 100 : 0);

  const fracaoAlvo = base > 0 ? Math.min(Math.max(arrecadado, 0) / base, 1) : 0;
  const fracao = useProgressoAnimado(fracaoAlvo);
  const progresso = fracao * CIRCUNFERENCIA;

  const VAO = categorias.length > 1 ? 2 : 0;
  const tamanhos = categorias.map(([, grupo]) => (soma > 0 ? (grupo.total / soma) * CIRCUNFERENCIA : 0));
  const fatias = categorias.map(([categoria, grupo], indice) => {
    const inicio = tamanhos.slice(0, indice).reduce((total, tamanho) => total + tamanho, 0);
    const tamanho = Math.max(tamanhos[indice] - VAO, 0.5);
    const antes = categorias.slice(0, indice).reduce((total, [, g]) => total + g.total, 0);
    const acumulado = antes + grupo.total;
    return {
      categoria,
      grupo,
      indice,
      inicio,
      tamanho,
      aceso: Math.min(Math.max(progresso - inicio, 0), tamanho),
      acumulado,
      // Situação pelo valor de verdade (não pela animação): a legenda não "pisca" enquanto a ponta corre.
      situacao: arrecadado >= acumulado ? 'coberto' : arrecadado > antes ? 'andamento' : 'pendente',
      falta: acumulado - Math.max(arrecadado, 0),
    } as const;
  });

  const angulo = (progresso / CIRCUNFERENCIA) * 2 * Math.PI - Math.PI / 2;
  const ponta = { x: 50 + RAIO * Math.cos(angulo), y: 50 + RAIO * Math.sin(angulo) };

  return (
    <figure>
      <figcaption className="rotulo mb-4">O que a arrecadação já cobre</figcaption>
      <div className="orcamento-rosca">
        <div className="orcamento-rosca__grafico">
          <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label={`Rosca do orçamento: ${formatarMoeda(arrecadado)} arrecadados de ${formatarMoeda(base)}`}
          >
            {fatias.map((fatia) => (
              <g key={fatia.categoria} className={`orcamento-rosca__serie-${fatia.indice + 1}`}>
                <circle
                  cx="50"
                  cy="50"
                  r={RAIO}
                  fill="none"
                  strokeWidth="14"
                  className="orcamento-rosca__fundo"
                  strokeDasharray={`${fatia.tamanho} ${CIRCUNFERENCIA - fatia.tamanho}`}
                  strokeDashoffset={-fatia.inicio}
                  transform="rotate(-90 50 50)"
                >
                  <title>{`${fatia.categoria}: ${formatarMoeda(fatia.grupo.total)}`}</title>
                </circle>
                {fatia.aceso > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r={RAIO}
                    fill="none"
                    strokeWidth="14"
                    className="orcamento-rosca__aceso"
                    strokeDasharray={`${fatia.aceso} ${CIRCUNFERENCIA - fatia.aceso}`}
                    strokeDashoffset={-fatia.inicio}
                    transform="rotate(-90 50 50)"
                  />
                )}
              </g>
            ))}
            {fracao > 0 && fracao < 1 && (
              <circle cx={ponta.x} cy={ponta.y} r="5" className="orcamento-rosca__ponta" />
            )}
          </svg>
          <div className="orcamento-rosca__centro" aria-hidden="true">
            <span className="paragrafo enfase texto-forte numero">{formatarMoeda(arrecadado)}</span>
            <span className="legenda texto-fraco">de {formatarMoeda(base)}</span>
          </div>
        </div>
        <ul className="orcamento-rosca__legenda" aria-label="Itens do orçamento">
          {fatias.map(({ categoria, grupo, indice, acumulado, situacao, falta }) => {
            const comDescricao = grupo.itens.filter((item) => item.descricao?.trim());
            return (
              <li key={categoria} className={`orcamento-rosca__linha orcamento-rosca__linha--${situacao}`}>
                <span className={`orcamento-rosca__amostra orcamento-rosca__serie-${indice + 1}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <h3 className="paragrafo enfase texto-forte">{categoria}</h3>
                    <span className="paragrafo texto-forte numero">
                      {formatarMoeda(grupo.total)} <span className="texto-fraco">({PERCENTUAL.format(percentual(acumulado))}%)</span>
                    </span>
                  </div>
                  {grupo.itens.length === 1
                    ? comDescricao.length === 1 && <p className="paragrafo texto-padrao mt-1">{grupo.itens[0].descricao}</p>
                    : (
                      <ul className="mt-1 flex flex-col gap-0.5" aria-label={`Itens de ${categoria}`}>
                        {grupo.itens.map((item) => (
                          <li key={item.idOrcamento} className="flex justify-between gap-3 paragrafo texto-padrao">
                            <span>{categoria === 'Outras' ? item.categoria : (item.descricao?.trim() || 'Sem descrição')}</span>
                            <span className="numero whitespace-nowrap">{formatarMoeda(item.valor)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  {situacao === 'coberto' && (
                    <p className="legenda texto-marca font-semibold mt-1">
                      <i className="fa-solid fa-check mr-1" aria-hidden="true"></i>Coberto
                    </p>
                  )}
                  {situacao === 'andamento' && (
                    <p className="legenda texto-fraco mt-1">Faltam {formatarMoeda(falta)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="legenda texto-fraco mt-4">
        Os itens são cobertos do mais barato para o mais caro. O dinheiro só é repassado ao pesquisador no fim da campanha.
      </p>
    </figure>
  );
}
