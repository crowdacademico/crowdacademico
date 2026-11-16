import { useLayoutEffect, useRef, useState } from 'react';
import { dashboardApi } from '../../services/29-dashboard/api/dashboard.api';
import type { FiltroSerieDashboard, PontoSerieDashboard } from '../../services/29-dashboard/type/dashboard.type';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import {
  formatarDataEixo,
  formatarMoeda,
  formatarNumeroCompacto,
} from '../../services/constant/util/formatacao.util';

// O gráfico do Dashboard (16-11-2026), no padrão da tela inicial da Stripe: o total do período em destaque, a comparação
// com o período anterior e a linha ao longo do tempo. Desenhado à mão em SVG (sem biblioteca de gráficos no projeto),
// seguindo o guia de visualização: uma série só, numa cor só (a da marca), linha de 2px, grade discreta, sem legenda (o
// título diz o que é), e a camada de passar o mouse (linha vertical + ponto + caixinha com o valor do dia). A tabela
// "Ver os números" é a versão para quem não enxerga o gráfico.

type Metrica = 'arrecadado' | 'apoios' | 'cadastros';

const METRICAS: { chave: Metrica; rotulo: string; moeda: boolean }[] = [
  { chave: 'arrecadado', rotulo: 'Arrecadação', moeda: true },
  { chave: 'apoios', rotulo: 'Apoios pagos', moeda: false },
  { chave: 'cadastros', rotulo: 'Cadastros', moeda: false },
];

// Atalhos de período e o "Personalizado" (16-11-2026, Lucas: escolher início e fim). `comparacao` já vem com a contração
// certa ("aos", "ao"), para a frase "em relação aos 30 dias anteriores".
type Atalho = '7d' | '30d' | '12m' | 'personalizado';

const ATALHOS: { chave: Atalho; rotulo: string; comparacao: string }[] = [
  { chave: '7d', rotulo: '7 dias', comparacao: 'aos 7 dias anteriores' },
  { chave: '30d', rotulo: '30 dias', comparacao: 'aos 30 dias anteriores' },
  { chave: '12m', rotulo: '12 meses', comparacao: 'aos 12 meses anteriores' },
  { chave: 'personalizado', rotulo: 'Personalizado', comparacao: 'ao período anterior, de mesmo tamanho' },
];

// No personalizado, até ~3 meses o gráfico vai dia a dia; acima disso, mês a mês (dia a dia viraria um borrão).
const DIAS_ATE_AGRUPAR_POR_MES = 92;

// AAAA-MM-DD da data LOCAL (o "hoje" de quem usa, o mesmo fuso que o banco usa no gráfico).
function isoLocal(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function filtroDoAtalho(atalho: Exclude<Atalho, 'personalizado'>): FiltroSerieDashboard {
  const hoje = new Date();
  const fim = isoLocal(hoje);
  if (atalho === '12m') return { inicio: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)), fim, agrupar: 'mes' };
  const dias = atalho === '7d' ? 7 : 30;
  return { inicio: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (dias - 1))), fim, agrupar: 'dia' };
}

function diasEntre(inicio: string, fim: string): number {
  return Math.round(Math.abs(Date.parse(fim) - Date.parse(inicio)) / 86_400_000) + 1;
}

// Botões lado a lado, um marcado (o "segmented control" dos painéis).
function Segmentado<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
}: {
  opcoes: { chave: T; rotulo: string }[];
  valor: T;
  aoMudar: (valor: T) => void;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex rounded-lg border borda-padrao fundo-sutil p-0.5">
      {opcoes.map((opcao) => (
        <button
          key={opcao.chave}
          type="button"
          aria-pressed={valor === opcao.chave}
          onClick={() => aoMudar(opcao.chave)}
          className={
            'px-3 py-1 rounded-md legenda enfase transition-colors ' +
            (valor === opcao.chave ? 'fundo-cartao texto-forte shadow-sm' : 'texto-fraco hover:texto-padrao')
          }
        >
          {opcao.rotulo}
        </button>
      ))}
    </div>
  );
}

// Largura do elemento, acompanhando o redimensionamento (o SVG é desenhado em pixels de verdade, para a linha e o ponto
// não ficarem esticados).
function useLargura() {
  const ref = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  useLayoutEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);
  return { ref, largura };
}

// Teto "redondo" do eixo (1, 2, 2,5 ou 5 vezes uma potência de 10), para a grade cair em números legíveis.
function tetoRedondo(maximo: number): number {
  if (maximo <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const passo = [1, 2, 2.5, 5, 10].find((p) => p * potencia >= maximo) ?? 10;
  return passo * potencia;
}

const ALTURA = 220;
const MARGEM = { cima: 12, direita: 12, baixo: 28, esquerda: 56 };

function GraficoLinha({
  pontos,
  mensal,
  formatar,
}: {
  pontos: { inicio: string; valor: number }[];
  mensal: boolean;
  formatar: (valor: number) => string;
}) {
  const { ref, largura } = useLargura();
  const [ativo, setAtivo] = useState<number | null>(null);
  const n = pontos.length;
  const larguraPlot = Math.max(0, largura - MARGEM.esquerda - MARGEM.direita);
  const alturaPlot = ALTURA - MARGEM.cima - MARGEM.baixo;
  const teto = tetoRedondo(Math.max(...pontos.map((p) => p.valor), 0));
  const x = (i: number) => MARGEM.esquerda + (n <= 1 ? larguraPlot / 2 : (i / (n - 1)) * larguraPlot);
  const y = (valor: number) => MARGEM.cima + alturaPlot - (valor / teto) * alturaPlot;
  const base = MARGEM.cima + alturaPlot;

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const area = n > 0 ? `${linha} L${x(n - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z` : '';
  const marcasX = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : pontos.map((_, i) => i);

  const aoMover = (evento: React.PointerEvent<SVGSVGElement>) => {
    if (n === 0 || larguraPlot <= 0) return;
    const caixa = evento.currentTarget.getBoundingClientRect();
    const relativo = (evento.clientX - caixa.left - MARGEM.esquerda) / larguraPlot;
    setAtivo(Math.min(n - 1, Math.max(0, Math.round(relativo * (n - 1)))));
  };

  const pontoAtivo = ativo === null ? null : pontos[ativo];
  return (
    <div ref={ref} className="relative w-full" style={{ height: ALTURA }}>
      {largura > 0 && (
        <svg
          width={largura}
          height={ALTURA}
          role="img"
          aria-label="Gráfico de linha do período; os números estão em 'Ver os números', abaixo."
          onPointerMove={aoMover}
          onPointerLeave={() => setAtivo(null)}
          className="block touch-none"
        >
          {/* Grade discreta: 0, metade e o teto. */}
          {[0, 0.5, 1].map((fracao) => (
            <g key={fracao}>
              <line
                x1={MARGEM.esquerda}
                x2={MARGEM.esquerda + larguraPlot}
                y1={y(teto * fracao)}
                y2={y(teto * fracao)}
                style={{ stroke: 'var(--cor-borda)' }}
                strokeDasharray={fracao === 0 ? undefined : '3 4'}
              />
              <text
                x={MARGEM.esquerda - 8}
                y={y(teto * fracao)}
                textAnchor="end"
                dominantBaseline="middle"
                className="legenda"
                style={{ fill: 'var(--cor-texto-fraco)' }}
              >
                {formatarNumeroCompacto(teto * fracao)}
              </text>
            </g>
          ))}
          {marcasX.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={ALTURA - 8}
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
              className="legenda"
              style={{ fill: 'var(--cor-texto-fraco)' }}
            >
              {formatarDataEixo(pontos[i].inicio, mensal)}
            </text>
          ))}
          <path d={area} style={{ fill: 'color-mix(in srgb, var(--cor-marca) 14%, transparent)' }} />
          <path d={linha} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" style={{ stroke: 'var(--cor-marca)' }} />
          {pontoAtivo && ativo !== null && (
            <g>
              <line x1={x(ativo)} x2={x(ativo)} y1={MARGEM.cima} y2={base} style={{ stroke: 'var(--cor-texto-fraco)' }} strokeDasharray="2 3" />
              <circle
                cx={x(ativo)}
                cy={y(pontoAtivo.valor)}
                r={5}
                strokeWidth={2}
                style={{ fill: 'var(--cor-marca)', stroke: 'var(--cor-fundo-cartao)' }}
              />
            </g>
          )}
        </svg>
      )}
      {pontoAtivo && ativo !== null && (
        <div
          className="pointer-events-none absolute z-10 fundo-cartao border borda-padrao rounded-lg shadow-lg px-3 py-2 whitespace-nowrap"
          style={{
            top: 0,
            left: Math.min(Math.max(x(ativo) - 70, 0), Math.max(0, largura - 140)),
          }}
        >
          <div className="legenda texto-fraco">{formatarDataEixo(pontoAtivo.inicio, mensal)}</div>
          <div className="paragrafo enfase texto-forte">{formatar(pontoAtivo.valor)}</div>
        </div>
      )}
    </div>
  );
}

// Variação contra o período anterior, com seta e sinal (nunca só a cor). Sem base para comparar: diz isso.
function Variacao({ atual, anterior, comparacao }: { atual: number; anterior: number; comparacao: string }) {
  if (anterior === 0) {
    return <span className="legenda texto-fraco">{atual === 0 ? 'Nada no período' : 'Nada no período anterior para comparar'}</span>;
  }
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const sobe = pct >= 0;
  return (
    <span className="legenda texto-fraco">
      <span className={'badge ' + (sobe ? 'badge-sucesso' : 'badge-erro')}>
        <i className={`fa-solid ${sobe ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} mr-1`} aria-hidden="true" />
        {sobe ? '+' : '−'}
        {Math.abs(pct)}%
      </span>{' '}
      em relação {comparacao}
    </span>
  );
}

export function CartaoGrafico({ authFetch }: { authFetch: AuthFetch }) {
  const [metrica, setMetrica] = useState<Metrica>('arrecadado');
  const [atalho, setAtalho] = useState<Atalho>('30d');
  // Datas do "Personalizado": começam com o período que estava na tela (trocar de atalho não perde a escolha).
  const [personalizado, setPersonalizado] = useState(() => filtroDoAtalho('30d'));
  const hoje = isoLocal(new Date());
  const filtro: FiltroSerieDashboard =
    atalho === 'personalizado'
      ? {
          inicio: personalizado.inicio,
          fim: personalizado.fim,
          agrupar: diasEntre(personalizado.inicio, personalizado.fim) > DIAS_ATE_AGRUPAR_POR_MES ? 'mes' : 'dia',
        }
      : filtroDoAtalho(atalho);
  const { dado, carregando, erro } = useBuscar(() => dashboardApi.buscarSerie(authFetch, filtro), [filtro.inicio, filtro.fim, filtro.agrupar], {
    mostraTexto: true,
  });

  const definicao = METRICAS.find((m) => m.chave === metrica) ?? METRICAS[0];
  const comparacao = ATALHOS.find((a) => a.chave === atalho)?.comparacao ?? '';
  const formatar = (valor: number) => (definicao.moeda ? formatarMoeda(valor) : String(valor));
  const pontos = (dado?.pontos ?? []).map((p: PontoSerieDashboard) => ({ inicio: p.inicio, valor: p[metrica] }));
  const total = pontos.reduce((soma, p) => soma + p.valor, 0);
  const mensal = dado?.agrupar === 'mes';
  const trocarAtalho = (novo: Atalho) => {
    if (novo === 'personalizado' && atalho !== 'personalizado') setPersonalizado({ ...filtro });
    setAtalho(novo);
  };

  return (
    <section className="cartao-painel p-5" aria-labelledby="dashboard-grafico">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 id="dashboard-grafico" className="subtitulo">
            {definicao.rotulo}
          </h2>
          <p className="numero-metrica texto-forte mt-1">{dado ? formatar(total) : '…'}</p>
          {dado && <Variacao atual={total} anterior={dado.anterior[metrica]} comparacao={comparacao} />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmentado rotulo="O que mostrar" opcoes={METRICAS} valor={metrica} aoMudar={setMetrica} />
          <Segmentado rotulo="Período" opcoes={ATALHOS} valor={atalho} aoMudar={trocarAtalho} />
        </div>
      </div>
      {atalho === 'personalizado' && (
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="legenda texto-fraco">
            <span className="block mb-1 enfase">De</span>
            <input
              type="date"
              className="input-padrao py-1.5"
              value={personalizado.inicio}
              max={personalizado.fim || hoje}
              onChange={(evento) => evento.target.value && setPersonalizado((atual) => ({ ...atual, inicio: evento.target.value }))}
            />
          </label>
          <label className="legenda texto-fraco">
            <span className="block mb-1 enfase">Até</span>
            <input
              type="date"
              className="input-padrao py-1.5"
              value={personalizado.fim}
              min={personalizado.inicio}
              max={hoje}
              onChange={(evento) => evento.target.value && setPersonalizado((atual) => ({ ...atual, fim: evento.target.value }))}
            />
          </label>
          <span className="legenda texto-fraco pb-2">{filtro.agrupar === 'mes' ? 'Mês a mês' : 'Dia a dia'}</span>
        </div>
      )}

      {erro && !dado ? (
        <p className="paragrafo texto-fraco">Não foi possível carregar o gráfico.</p>
      ) : carregando && !dado ? (
        <div className="fundo-sutil rounded-lg animate-pulse" style={{ height: ALTURA }} aria-label="Carregando o gráfico" />
      ) : (
        <>
          <GraficoLinha pontos={pontos} mensal={mensal} formatar={formatar} />
          <details className="mt-2">
            <summary className="legenda link-texto cursor-pointer w-fit">Ver os números</summary>
            <div className="mt-2 max-h-56 overflow-y-auto">
              <table className="w-full legenda">
                <thead>
                  <tr className="texto-fraco text-left">
                    <th className="py-1 font-semibold">{mensal ? 'Mês' : 'Dia'}</th>
                    <th className="py-1 font-semibold text-right">{definicao.rotulo}</th>
                  </tr>
                </thead>
                <tbody>
                  {pontos.map((p) => (
                    <tr key={p.inicio} className="border-t borda-padrao">
                      <td className="py-1">{formatarDataEixo(p.inicio, mensal)}</td>
                      <td className="py-1 text-right numero">{formatar(p.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
