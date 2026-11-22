import { useState } from 'react';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';

type Meio = 'pix' | 'cartao' | 'boleto';

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

// RF-063: página pública de Transparência, sem login: taxa vigente da plataforma, tarifa de cada meio de pagamento e
// um simulador. Os números vêm das configurações públicas (as mesmas que o banco usa), nunca escritos aqui; os
// padrões abaixo só valem enquanto elas carregam. As contas espelham o banco (05):
//   - tarifa: fn_contribuicao_define_taxa_pagamento (Pix e boleto fixos; cartão = (valor + fixa) / (1 - %), para cima);
//   - o que chega ao pesquisador: liquido_repasse (taxa percentual, nunca menos que taxa_minima_repasse por repasse).
export function Transparencia() {
  const { obterNumero, obterConfiguracao } = useConfiguracoes();
  const taxaPlataforma = obterNumero('taxa_plataforma_padrao', 5);
  const taxaMinimaRepasse = obterNumero('taxa_minima_repasse', 2);
  const tarifaPix = obterNumero('taxa_pagamento_pix', 1.99);
  const tarifaBoleto = obterNumero('taxa_pagamento_boleto', 1.99);
  const cartaoPercentual = obterNumero('taxa_cartao_percentual', 1.99);
  const cartaoFixa = obterNumero('taxa_cartao_fixa', 0.49);
  const valorMinimo = obterNumero('valor_minimo_contribuicao', 5);
  const boletoHabilitado = obterConfiguracao('boleto_habilitado', false) === true;
  const cartaoHabilitado = obterConfiguracao('cartao_habilitado', true) !== false;
  const cartaoMinimo = obterNumero('valor_minimo_contribuicao_cartao', 20);
  const cartaoMaximo = obterNumero('valor_maximo_contribuicao_cartao', 500);
  const carenciaRepasse = obterNumero('repasse_carencia_dias', 15);
  const prazoDesistencia = obterNumero('desistencia_prazo_dias', 7);

  const [valor, setValor] = useState('100');
  const [meio, setMeio] = useState<Meio>('pix');

  const valorNumerico = Number(valor);
  const valorValido = Number.isFinite(valorNumerico) && valorNumerico >= valorMinimo;
  const tarifa = !valorValido
    ? 0
    : meio === 'pix'
      ? tarifaPix
      : meio === 'boleto'
        ? tarifaBoleto
        : arredondar(Math.ceil(((valorNumerico + cartaoFixa) / (1 - cartaoPercentual / 100)) * 100) / 100 - valorNumerico);
  const taxaPercentual = valorValido ? arredondar((valorNumerico * taxaPlataforma) / 100) : 0;
  const taxaRetida = valorValido ? Math.min(valorNumerico, Math.max(taxaPercentual, taxaMinimaRepasse)) : 0;
  const chegaAoPesquisador = valorValido ? arredondar(valorNumerico - taxaRetida) : 0;

  const meios: { chave: Meio; rotulo: string; tarifa: string; observacao: string }[] = [
    { chave: 'pix', rotulo: 'Pix', tarifa: formatarMoeda(tarifaPix), observacao: 'Aceito em todas as campanhas.' },
    ...(cartaoHabilitado
      ? [{
          chave: 'cartao' as const,
          rotulo: 'Cartão de crédito',
          tarifa: `${cartaoPercentual}% + ${formatarMoeda(cartaoFixa)}`,
          observacao: `Só em campanhas flexíveis, para quem tem conta, de ${formatarMoeda(cartaoMinimo)} a ${formatarMoeda(cartaoMaximo)}.`,
        }]
      : []),
    ...(boletoHabilitado
      ? [{
          chave: 'boleto' as const,
          rotulo: 'Boleto',
          tarifa: formatarMoeda(tarifaBoleto),
          observacao: 'Só em campanhas flexíveis, para quem tem conta.',
        }]
      : []),
  ];
  const meioAtual = meios.some((item) => item.chave === meio) ? meio : 'pix';

  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="largura-site w-full">
        <CabecalhoPagina
          className="mb-12"
          titulo="Taxas e transparência"
          descricao="Quanto a plataforma cobra, quanto custa cada meio de pagamento, para onde vai o seu apoio e quanto dele chega ao pesquisador."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <section className="fundo-cartao border borda-padrao rounded-xl p-6" aria-labelledby="transparencia-taxa">
            <h2 id="transparencia-taxa" className="subtitulo texto-forte mb-3">Taxa da plataforma</h2>
            <p className="numero numero--destaque texto-forte mb-2">{taxaPlataforma}%</p>
            <p className="paragrafo texto-padrao">
              Descontada do valor arrecadado, no repasse ao pesquisador. Em cada repasse, a taxa nunca é menor que{' '}
              <strong>{formatarMoeda(taxaMinimaRepasse)}</strong>, que cobre o custo da transferência. A taxa de uma
              campanha fica fixa a partir da aprovação.
            </p>
          </section>

          <section className="fundo-cartao border borda-padrao rounded-xl p-6" aria-labelledby="transparencia-tarifas">
            <h2 id="transparencia-tarifas" className="subtitulo texto-forte mb-3">Tarifas dos meios de pagamento</h2>
            <p className="paragrafo texto-padrao mb-4">
              Cobradas pelo provedor de pagamento e pagas por quem apoia, <strong>por cima</strong> do valor do apoio.
              Não saem do que chega ao pesquisador.
            </p>
            <dl className="space-y-3">
              {meios.map((item) => (
                <div key={item.chave} className="flex justify-between gap-4 border-b borda-padrao pb-2 last:border-0">
                  <dt>
                    <span className="font-bold texto-forte">{item.rotulo}</span>
                    <span className="block legenda texto-fraco">{item.observacao}</span>
                  </dt>
                  <dd className="numero font-bold texto-forte whitespace-nowrap">{item.tarifa}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <section className="fundo-cartao border borda-padrao rounded-xl p-6 sm:p-8 mb-10" aria-labelledby="transparencia-fluxo">
          <h2 id="transparencia-fluxo" className="subtitulo texto-forte mb-2">Para onde vai o seu apoio</h2>
          <p className="paragrafo texto-padrao mb-6">
            O dinheiro não vai direto para o pesquisador. Ele passa por etapas, e nenhuma depende de ação manual.
          </p>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Você paga', 'O pagamento é feito na página segura do provedor de pagamento, e a plataforma não guarda dados do seu cartão.'],
              ['Fica guardado', 'Cada apoio confirmado fica na conta da plataforma no provedor até o fim da campanha.'],
              ['A campanha encerra', 'Ao fim do prazo, o sistema decide o destino conforme o modelo e a meta da campanha.'],
              ['Repasse ou devolução', `O pesquisador recebe por Pix, após ${carenciaRepasse} dias de carência, ou cada apoiador recebe o valor de volta.`],
            ].map(([titulo, texto], indice) => (
              <li key={titulo} className="flex items-start gap-3">
                <span className="pagina-publica__indice shrink-0">{indice + 1}</span>
                <div>
                  <h3 className="font-bold texto-forte mb-1">{titulo}</h3>
                  <p className="paragrafo texto-padrao">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="legenda mt-6 texto-fraco">
            Você pode desistir de um apoio em até {prazoDesistencia} dias. A taxa da campanha fica fixa desde a
            aprovação, mesmo que a taxa da plataforma mude depois.
          </p>
        </section>

        <section className="fundo-cartao border borda-padrao rounded-xl p-6 sm:p-8" aria-labelledby="transparencia-simulador">
          <h2 id="transparencia-simulador" className="subtitulo texto-forte mb-6">Simulador</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label htmlFor="simulador-valor" className="rotulo block mb-2">
                  Valor do apoio (R$)
                </label>
                <input
                  id="simulador-valor"
                  type="number"
                  min={valorMinimo}
                  step="0.01"
                  inputMode="decimal"
                  value={valor}
                  onChange={(evento) => setValor(evento.target.value)}
                  className="input-padrao w-full"
                  aria-describedby="simulador-valor-ajuda"
                />
                <p id="simulador-valor-ajuda" className={`legenda mt-2 ${valorValido ? '' : 'texto-erro'}`}>
                  Mínimo de {formatarMoeda(valorMinimo)}.
                </p>
              </div>
              <fieldset>
                <legend className="rotulo mb-2">Meio de pagamento</legend>
                <div className="flex flex-wrap gap-2">
                  {meios.map((item) => (
                    <button
                      key={item.chave}
                      type="button"
                      aria-pressed={meioAtual === item.chave}
                      onClick={() => setMeio(item.chave)}
                      className={`pilula-valor ${meioAtual === item.chave ? 'pilula-valor--ativa' : ''} px-4 py-2 rounded-lg text-sm font-bold border-2`}
                    >
                      {item.rotulo}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <dl className="space-y-3 text-sm" aria-live="polite">
              <div className="flex justify-between gap-4">
                <dt className="texto-fraco">Seu apoio</dt>
                <dd className="numero font-bold texto-forte">{valorValido ? formatarMoeda(valorNumerico) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="texto-fraco">Tarifa do meio de pagamento</dt>
                <dd className="numero texto-padrao">{valorValido ? `+ ${formatarMoeda(tarifa)}` : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t borda-padrao pt-3">
                <dt className="font-bold texto-forte">Você paga</dt>
                <dd className="numero font-black texto-forte">{valorValido ? formatarMoeda(valorNumerico + tarifa) : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-4">
                <dt className="texto-fraco">Taxa da plataforma ({taxaPlataforma}%)</dt>
                <dd className="numero texto-padrao">{valorValido ? `− ${formatarMoeda(taxaRetida)}` : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t borda-padrao pt-3">
                <dt className="font-bold texto-forte">Chega ao pesquisador</dt>
                <dd className="numero font-black texto-marca">{valorValido ? formatarMoeda(chegaAoPesquisador) : '—'}</dd>
              </div>
            </dl>
          </div>
          <ul className="legenda mt-6 texto-fraco list-disc pl-5 space-y-1">
            {/* O boleto só é citado quando está ligado (boleto_habilitado). */}
            <li>
              Estimativa. {boletoHabilitado ? 'A tarifa do cartão e a do boleto são confirmadas' : 'A tarifa do cartão é confirmada'}{' '}
              pelo provedor no pagamento.
            </li>
            <li>
              O mínimo de {formatarMoeda(taxaMinimaRepasse)} vale para o repasse inteiro da campanha, não para cada
              apoio. Aqui, o simulador trata o seu apoio como se fosse o único da campanha.
            </li>
            <li>
              Em campanha Tudo ou Nada que não atinge a meta, o valor do apoio é devolvido, mas a tarifa do meio de
              pagamento não.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}