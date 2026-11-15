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
    {
      chave: 'cartao',
      rotulo: 'Cartão de crédito',
      tarifa: `${cartaoPercentual}% + ${formatarMoeda(cartaoFixa)}`,
      observacao: 'Só em campanhas flexíveis, para quem tem conta.',
    },
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
      <div className="mx-auto max-w-5xl px-4">
        <CabecalhoPagina
          className="mb-12"
          titulo="Transparência"
          descricao="Quanto a plataforma cobra, quanto custa cada meio de pagamento e quanto do seu apoio chega ao pesquisador."
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
          <p className="legenda mt-6 texto-fraco">
            Estimativa. A tarifa do cartão e a do boleto são confirmadas pelo provedor no pagamento. O mínimo de{' '}
            {formatarMoeda(taxaMinimaRepasse)} vale para o repasse inteiro da campanha, não para cada apoio: aqui o
            simulador trata o seu apoio como se fosse o único da campanha. Em campanha Tudo ou Nada que não bate a meta,
            o valor do apoio é devolvido (a tarifa do meio de pagamento, não).
          </p>
        </section>
      </div>
    </div>
  );
}
