import { useState } from 'react';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';

type MeioPagamento = 'pix' | 'boleto' | 'cartao_credito';

interface EstimativaApoio {
  valorContribuicaoCentavos: number;
  tarifaProvedorCentavos: number;
  totalCobrancaCentavos: number;
  liquidoPesquisadorCentavos: number;
}

function lerCentavos(valor: string): number | null {
  const partes = /^(\d+)(?:\.(\d{0,2}))?$/.exec(valor);
  if (!partes) {
    return null;
  }
  const centavos = Number(partes[1]) * 100 + Number((partes[2] || '').padEnd(2, '0'));
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

function emCentavos(valor: number | null): number | null {
  if (valor === null || !Number.isFinite(valor) || valor < 0) {
    return null;
  }
  const centavos = Math.round(valor * 100);
  return Number.isSafeInteger(centavos) ? centavos : null;
}

function estimarApoio(
  valorCentavos: number,
  meio: MeioPagamento,
  taxaPlataforma: number | null,
  taxaPix: number | null,
  taxaBoleto: number | null,
  taxaCartaoPercentual: number | null,
  taxaCartaoFixa: number | null,
  taxaMinimaRepasse: number | null,
): EstimativaApoio | null {
  const taxaPlataformaBps = taxaPlataforma === null ? null : Math.round(taxaPlataforma * 100);
  const taxaMinimaRepasseCentavos = emCentavos(taxaMinimaRepasse);
  if (
    taxaPlataformaBps === null ||
    taxaPlataformaBps < 0 ||
    taxaPlataformaBps > 10000 ||
    taxaMinimaRepasseCentavos === null
  ) {
    return null;
  }

  let tarifaProvedorCentavos: number;
  if (meio === 'pix' || meio === 'boleto') {
    const tarifa = emCentavos(meio === 'pix' ? taxaPix : taxaBoleto);
    if (tarifa === null) {
      return null;
    }
    tarifaProvedorCentavos = tarifa;
  } else {
    const taxaCartaoBps =
      taxaCartaoPercentual === null ? null : Math.round(taxaCartaoPercentual * 100);
    const tarifaFixaCentavos = emCentavos(taxaCartaoFixa);
    if (
      taxaCartaoBps === null ||
      taxaCartaoBps < 0 ||
      taxaCartaoBps >= 10000 ||
      tarifaFixaCentavos === null
    ) {
      return null;
    }
    const baseCobrança = (BigInt(valorCentavos) + BigInt(tarifaFixaCentavos)) * 10000n;
    const divisor = BigInt(10000 - taxaCartaoBps);
    const totalCartaoCentavosBigInt = (baseCobrança + divisor - 1n) / divisor;
    if (totalCartaoCentavosBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
      return null;
    }
    const totalCartaoCentavos = Number(totalCartaoCentavosBigInt);
    tarifaProvedorCentavos = totalCartaoCentavos - valorCentavos;
  }

  const liquidoPercentualCentavos = Number(
    (BigInt(valorCentavos) * BigInt(10000 - taxaPlataformaBps) + 5000n) / 10000n,
  );
  const liquidoPesquisadorCentavos = Math.max(
    Math.min(liquidoPercentualCentavos, valorCentavos - taxaMinimaRepasseCentavos),
    0,
  );
  const totalCobrancaCentavos = valorCentavos + tarifaProvedorCentavos;
  if (!Number.isSafeInteger(totalCobrancaCentavos)) {
    return null;
  }
  return {
    valorContribuicaoCentavos: valorCentavos,
    tarifaProvedorCentavos,
    totalCobrancaCentavos,
    liquidoPesquisadorCentavos,
  };
}

function dinheiro(valor: number | null): string {
  return valor === null
    ? 'Não disponível na configuração pública'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function percentual(valor: number | null): string {
  return valor === null
    ? 'Não disponível na configuração pública'
    : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(valor)}%`;
}

function prazo(valor: number | null, unidade: string): string {
  return valor === null ? 'Não disponível na configuração pública' : `${valor} ${unidade}`;
}

export function Transparencia() {
  const { carregando, erro, obterConfiguracao } = useConfiguracoes();
  const [valorApoio, setValorApoio] = useState('');
  const [meioPagamento, setMeioPagamento] = useState<MeioPagamento>('pix');
  const obterNumeroPublico = (chave: string): number | null => {
    const valor = obterConfiguracao(chave, '');
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
  };
  const taxaPlataforma = obterNumeroPublico('taxa_plataforma_padrao');
  const taxaPix = obterNumeroPublico('taxa_pagamento_pix');
  const taxaBoleto = obterNumeroPublico('taxa_pagamento_boleto');
  const taxaCartaoPercentual = obterNumeroPublico('taxa_cartao_percentual');
  const taxaCartaoFixa = obterNumeroPublico('taxa_cartao_fixa');
  const taxaMinimaRepasse = obterNumeroPublico('taxa_minima_repasse');
  const boletoHabilitado = obterConfiguracao('boleto_habilitado', '');
  const cartaoHabilitado = obterConfiguracao('cartao_habilitado', '');
  const validadePix = obterNumeroPublico('pix_validade_horas');
  const vencimentoBoleto = obterNumeroPublico('boleto_vencimento_dias');
  const valorCentavos = lerCentavos(valorApoio);
  const meioDesabilitado =
    (meioPagamento === 'boleto' && boletoHabilitado !== true) ||
    (meioPagamento === 'cartao_credito' && cartaoHabilitado !== true);
  const estimativa =
    !carregando && !meioDesabilitado && valorCentavos !== null
      ? estimarApoio(
          valorCentavos,
          meioPagamento,
          taxaPlataforma,
          taxaPix,
          taxaBoleto,
          taxaCartaoPercentual,
          taxaCartaoFixa,
          taxaMinimaRepasse,
        )
      : null;
  const configuracoesNecessarias = [
    ['taxa_plataforma_padrao', taxaPlataforma],
    ['taxa_minima_repasse', taxaMinimaRepasse],
    ...(meioPagamento === 'pix' ? [['taxa_pagamento_pix', taxaPix] as const] : []),
    ...(meioPagamento === 'boleto' ? [['taxa_pagamento_boleto', taxaBoleto] as const] : []),
    ...(meioPagamento === 'cartao_credito'
      ? ([
          ['taxa_cartao_percentual', taxaCartaoPercentual],
          ['taxa_cartao_fixa', taxaCartaoFixa],
        ] as const)
      : []),
  ];
  const configuracoesAusentes = configuracoesNecessarias
    .filter(([, valor]) => valor === null)
    .map(([chave]) => chave);
  const erroValorApoio =
    valorApoio !== '' && valorCentavos === null
      ? 'Informe um valor positivo com até duas casas decimais.'
      : null;

  const tarifaBoleto =
    boletoHabilitado === false
      ? 'Meio de pagamento desabilitado'
      : carregando
        ? 'Carregando…'
        : dinheiro(taxaBoleto);
  const tarifaCartao =
    cartaoHabilitado === false
      ? 'Meio de pagamento desabilitado'
      : carregando
        ? 'Carregando…'
        : `${percentual(taxaCartaoPercentual)} + ${dinheiro(taxaCartaoFixa)}`;

  return (
    <div id="view-transparencia" className="pagina-publica view-section flex-grow fundo-pagina min-h-screen py-16">
      <div className="mx-auto max-w-3xl px-4">
        <CabecalhoPagina
          className="mb-12"
          descricao="Consulte os parâmetros financeiros que a plataforma disponibiliza publicamente e saiba quando uma informação não está disponível."
          id="cabecalho-pagina-transparencia"
          titulo="Transparência"
        />

        {erro && (
          <p className="pagina-publica__cartao paragrafo texto-padrao mb-8" role="status">
            Não foi possível carregar as configurações públicas do backend. Os valores não serão
            substituídos por estimativas.
          </p>
        )}

        <section className="mb-12">
          <h2 className="titulo-secao mb-4">Composição da taxa</h2>
          <p className="paragrafo texto-padrao mb-4">
            A API não fornece uma composição percentual agregada: a taxa da plataforma e as tarifas
            de pagamento têm bases diferentes. A faixa abaixo não representa uma taxa total.
          </p>
          <div
            className="escala-progresso__trilho mb-2 h-3 w-full rounded-full bg-[var(--cor-borda)]"
            role="img"
            aria-label="Composição percentual agregada não disponível"
          >
            <div id="transparencia-barra-composicao" />
          </div>
          <div className="escala-progresso__eixo mb-4">
            <span className="paragrafo texto-padrao">0%</span>
            <span className="paragrafo texto-padrao">25%</span>
            <span className="paragrafo texto-padrao">50%</span>
            <span className="paragrafo texto-padrao">75%</span>
            <span className="paragrafo texto-padrao">100%</span>
          </div>
          <div id="transparencia-legenda-composicao" className="flex flex-wrap gap-x-6 gap-y-2">
            <p className="paragrafo texto-padrao">
              Taxa padrão da plataforma: {carregando ? 'Carregando…' : percentual(taxaPlataforma)}
            </p>
            <p className="paragrafo texto-padrao">
              Tarifa do Pix: {carregando ? 'Carregando…' : dinheiro(taxaPix)}
            </p>
            <p className="paragrafo texto-padrao">
              Tarifa do boleto: {tarifaBoleto}
            </p>
            <p className="paragrafo texto-padrao">
              Tarifa estimada do cartão: {tarifaCartao}
            </p>
          </div>
          <p className="paragrafo texto-padrao mt-4">
            A taxa padrão vale para novas campanhas; campanhas aprovadas mantêm o valor registrado
            para elas. As tarifas do cartão são estimativas do provedor.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="titulo-secao mb-4">Simule seu apoio</h2>
          <div className="painel-leitura pagina-publica__cartao">
            <div id="transparencia-simulador-campo" className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="rotulo-leitura">Valor da contribuição (R$)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  className="campo"
                  value={valorApoio}
                  onChange={(evento) => setValorApoio(evento.target.value)}
                  aria-describedby="transparencia-simulador-ajuda"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="rotulo-leitura">Meio de pagamento</span>
                <select
                  className="campo"
                  value={meioPagamento}
                  onChange={(evento) => setMeioPagamento(evento.target.value as MeioPagamento)}
                  disabled={carregando}
                >
                  <option value="pix">Pix</option>
                  <option value="boleto" disabled={boletoHabilitado !== true}>
                    Boleto{boletoHabilitado === false ? ' (indisponível)' : ''}
                  </option>
                  <option value="cartao_credito" disabled={cartaoHabilitado !== true}>
                    Cartão de crédito{cartaoHabilitado === false ? ' (indisponível)' : ''}
                  </option>
                </select>
              </label>
              <p id="transparencia-simulador-ajuda" className="paragrafo texto-padrao sm:col-span-2">
                Estimativa para uma contribuição individual em campanha que resulte em repasse. A taxa
                padrão é a da plataforma para novas campanhas; campanhas já aprovadas podem usar outra taxa.
              </p>
            </div>
            <div id="transparencia-simulador-decomposicao" className="painel-leitura__decomposicao">
              {carregando ? (
                <p className="paragrafo texto-padrao" role="status">Carregando os parâmetros financeiros…</p>
              ) : erro ? (
                <p className="paragrafo texto-padrao" role="alert">
                  Não foi possível carregar as configurações públicas. A estimativa está indisponível.
                </p>
              ) : meioDesabilitado ? (
                <p className="paragrafo texto-padrao" role="status">
                  Este meio de pagamento está desabilitado ou sua disponibilidade não foi informada publicamente.
                </p>
              ) : erroValorApoio ? (
                <p className="paragrafo texto-padrao" role="alert">{erroValorApoio}</p>
              ) : valorApoio === '' ? (
                <p className="paragrafo texto-padrao">Informe o valor para calcular a estimativa.</p>
              ) : configuracoesAusentes.length > 0 ? (
                <p className="paragrafo texto-padrao" role="status">
                  Estimativa indisponível. Faltam configurações públicas necessárias:{' '}
                  {configuracoesAusentes.join(', ')}.
                </p>
              ) : estimativa ? (
                <dl className="flex flex-col gap-2">
                  <div className="flex justify-between gap-4">
                    <dt className="paragrafo texto-padrao">Contribuição</dt>
                    <dd className="paragrafo texto-padrao">
                      {dinheiro(estimativa.valorContribuicaoCentavos / 100)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="paragrafo texto-padrao">Tarifa estimada do provedor, paga por quem apoia</dt>
                    <dd className="paragrafo texto-padrao">
                      {dinheiro(estimativa.tarifaProvedorCentavos / 100)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="paragrafo texto-padrao">Total estimado da cobrança</dt>
                    <dd className="paragrafo texto-padrao">
                      {dinheiro(estimativa.totalCobrancaCentavos / 100)}
                    </dd>
                  </div>
                  <p className="paragrafo texto-padrao mt-2">
                    A tarifa do provedor é estimada e não é descontada do repasse. A taxa da plataforma
                    incide sobre o repasse ao pesquisador, sujeito ao mínimo configurado.
                  </p>
                </dl>
              ) : (
                <p className="paragrafo texto-padrao" role="status">
                  Estimativa indisponível: verifique as configurações públicas do meio selecionado.
                </p>
              )}
            </div>
            <div className="painel-leitura__resultado">
              <span className="painel-leitura__resultado-rotulo">O projeto recebe</span>
              <strong id="transparencia-simulador-resultado" className="painel-leitura__resultado-valor">
                {carregando
                  ? 'Carregando…'
                  : erro
                    ? 'Não disponível'
                    : meioDesabilitado
                      ? 'Não disponível'
                      : erroValorApoio
                        ? 'Verifique o valor'
                        : valorApoio === ''
                          ? 'Informe o valor'
                          : configuracoesAusentes.length > 0
                            ? 'Não disponível'
                            : estimativa
                              ? dinheiro(estimativa.liquidoPesquisadorCentavos / 100)
                              : 'Não disponível'}
              </strong>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="titulo-secao mb-4">Prazos por meio de pagamento</h2>
          <div className="overflow-x-auto cartao pagina-publica__cartao p-0">
            <div id="transparencia-tabela-meios">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th scope="col" className="p-3">Meio</th>
                    <th scope="col" className="p-3">Prazo informado</th>
                    <th scope="col" className="p-3">Disponibilidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" className="p-3">Pix</th>
                    <td className="p-3">{carregando ? 'Carregando…' : prazo(validadePix, 'horas para pagamento')}</td>
                    <td className="p-3">Prazo de validade da cobrança</td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-3">Boleto</th>
                    <td className="p-3">
                      {boletoHabilitado === false
                        ? 'Meio de pagamento desabilitado'
                        : carregando
                          ? 'Carregando…'
                          : prazo(vencimentoBoleto, 'dias até o vencimento')}
                    </td>
                    <td className="p-3">
                      {boletoHabilitado === false
                        ? 'Desabilitado na configuração pública'
                        : 'Prazo de vencimento da cobrança'}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-3">Cartão de crédito</th>
                    <td className="p-3">
                      {cartaoHabilitado === false
                        ? 'Meio de pagamento desabilitado'
                        : 'Não disponível na configuração pública'}
                    </td>
                    <td className="p-3">
                      {cartaoHabilitado === false
                        ? 'Desabilitado na configuração pública'
                        : 'Prazo de liberação ao pesquisador não exposto publicamente'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="titulo-secao mb-4">Política de estorno</h2>
          <p id="transparencia-politica-estorno" className="paragrafo texto-padrao">
            A API pública não disponibiliza as regras e os prazos de estorno. Consulte os termos
            oficiais antes de realizar um apoio; esta página não presume nem calcula condições de
            devolução.
          </p>
        </section>

        <section>
          <h2 className="titulo-secao mb-4">O que a plataforma não faz</h2>
          <ul id="transparencia-o-que-nao-fazemos" className="space-y-3">
            <li className="paragrafo texto-padrao">
              Não há conteúdo oficial cadastrado para esta seção; nenhuma regra foi presumida.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
