import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { Campo } from '../../components/input/campo';
import { InputDinheiro } from '../../components/input/input-dinheiro';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';
import { contribuicaoPublicaApi } from '../../services/22-contribuicao/api/contribuicao-publica.api';
import type { MeioApoioPublico } from '../../services/22-contribuicao/type/contribuicao-publica.type';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { ErroHttp } from '../../services/constant/api/http.util';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { guardarApoio } from './apoio-em-andamento';

const VALORES_SUGERIDOS = [25, 50, 100, 150, 200];
const VALOR_MAXIMO = 99_999_999.99;

interface ModalApoiarProps {
  auth: Pick<UseAuthReturn, 'authFetch' | 'usuario' | 'aceitePendente'>;
  campanha: CampanhaResponse;
  // As recompensas ativas da campanha (a página já carregou): só para mostrar quais o valor alcança (RF-105, ninguém escolhe).
  recompensas: RecompensaResponse[];
  // "Apoiar com R$ X" da aba Recompensas (ou o ?valor= de um link antigo do checkout).
  valorInicial?: number;
  aoFechar: () => void;
}

const centavos = (valor: number) => Math.round(valor * 100) / 100;

// "Apoiar esta pesquisa" (16-11-2026, decisão do Lucas): aqui a pessoa só escolhe o valor (e o meio, quando o cartão é
// permitido) e vê o total; o pagamento em si é na página do Asaas (Pix com QR, ou cartão), para onde "Ir para o pagamento"
// manda. A volta cai em /apoio-confirmado, que acompanha a situação (ver apoio-em-andamento.ts). Substitui a antiga página
// /checkout, que tinha a tela de QR própria.
//
// As regras continuam no banco (trigger de contribuição, 05): valor mínimo, Tudo ou Nada só Pix, sem conta só Pix, faixa e
// interruptor do cartão. Aqui elas só decidem o que mostrar, para a pessoa não esbarrar num erro evitável.
export function ModalApoiar({ auth, campanha, recompensas, valorInicial, aoFechar }: ModalApoiarProps) {
  const navigate = useNavigate();
  const { obterNumero, obterConfiguracao } = useConfiguracoes();
  const minimo = obterNumero('valor_minimo_contribuicao', 5);
  const tarifaPix = obterNumero('taxa_pagamento_pix', 1.99);
  const cartaoLigado = String(obterConfiguracao('cartao_habilitado', true)) === 'true';
  const minimoCartao = obterNumero('valor_minimo_contribuicao_cartao', 20);
  const maximoCartao = obterNumero('valor_maximo_contribuicao_cartao', 500);
  const cartaoPercentual = obterNumero('taxa_cartao_percentual', 1.99);
  const cartaoFixa = obterNumero('taxa_cartao_fixa', 0.49);

  const flexivel = campanha.modelo === 'flexivel';
  // Cartão: só com conta, só em campanha flexível e com o cartão ligado pelo admin. Fora disso, Pix sem escolha nenhuma.
  const podeCartao = auth.usuario !== null && flexivel && cartaoLigado;

  const [valor, setValor] = useState(valorInicial && valorInicial > 0 ? valorInicial.toFixed(2) : '');
  const [meio, setMeio] = useState<MeioApoioPublico>('pix');
  const [cienteFlexivel, setCienteFlexivel] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | undefined>(undefined);
  // Falha sem resposta clara (rede, servidor): pode ter criado a cobrança; não deixa tentar de novo daqui.
  const [bloqueado, setBloqueado] = useState(false);

  // Voltar da página do Asaas: o navegador pode restaurar esta página da memória (cache de voltar/avançar), com o modal
  // parado em "Gerando a cobrança..." e o endereço já trocado para /apoio-confirmado. Recarrega para abrir o acompanhamento.
  useEffect(() => {
    const aoMostrar = (evento: PageTransitionEvent) => {
      if (evento.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', aoMostrar);
    return () => window.removeEventListener('pageshow', aoMostrar);
  }, []);

  const numero = Number(valor);
  const meioUsado: MeioApoioPublico = podeCartao ? meio : 'pix';
  const erroValor =
    valor === ''
      ? null
      : !(numero >= minimo)
        ? `O mínimo é ${formatarMoeda(minimo)}.`
        : numero > VALOR_MAXIMO
          ? 'Valor acima do máximo aceito.'
          : meioUsado === 'cartao_credito' && (numero < minimoCartao || numero > maximoCartao)
            ? `No cartão, de ${formatarMoeda(minimoCartao)} a ${formatarMoeda(maximoCartao)}. Para outro valor, use o Pix.`
            : null;
  const valorOk = valor !== '' && erroValor === null;

  // A mesma conta do banco (fn_contribuicao_define_taxa_pagamento, 05): estimativa; o Asaas pode acertar centavos.
  const tarifa = !valorOk
    ? null
    : meioUsado === 'pix'
      ? tarifaPix
      : centavos(Math.ceil(((numero + cartaoFixa) / (1 - cartaoPercentual / 100)) * 100) / 100 - numero);
  const total = tarifa === null ? null : centavos(numero + tarifa);

  const alcancadas = valorOk ? recompensas.filter((item) => item.valorMinimo <= numero) : [];
  const proxima = recompensas.find((item) => !valorOk || item.valorMinimo > numero);

  const podeIr = valorOk && aceitouTermos && (!flexivel || cienteFlexivel) && !auth.aceitePendente && !enviando && !bloqueado;

  const irParaPagamento = async () => {
    if (!podeIr) return;
    setEnviando(true);
    setErro(undefined);
    try {
      const criada = await contribuicaoPublicaApi.criar(auth.authFetch, {
        idCampanha: campanha.idCampanha,
        valor: numero,
        meioPagamento: meioUsado,
        ...(flexivel ? { cienteModeloFlexivel: true } : {}),
      });
      if (!criada.linkPagamento) {
        setBloqueado(true);
        setErro('A cobrança foi registrada, mas a página de pagamento não veio. Não tente de novo agora; fale com o suporte.');
        return;
      }
      let provedorTeste = false;
      try {
        provedorTeste = new URL(criada.linkPagamento).hostname === 'fake.local';
      } catch {
        provedorTeste = false;
      }
      guardarApoio({
        idContribuicao: criada.idContribuicao,
        tokenSessao: criada.tokenSessao,
        idCampanha: campanha.idCampanha,
        tituloCampanha: campanha.titulo,
        valor: criada.valor,
        taxaPagamento: criada.taxaPagamento,
        valorCobrado: criada.valorCobrado,
        meioPagamento: criada.meioPagamento,
        criadoEm: criada.criadoEm,
        linkPagamento: criada.linkPagamento,
        provedorTeste,
      });
      if (provedorTeste) {
        void navigate('/apoio-confirmado');
        return;
      }
      // O "voltar" do navegador, na página do Asaas, cai no acompanhamento (e não de novo neste modal).
      window.history.replaceState(null, '', '/apoio-confirmado');
      window.location.assign(criada.linkPagamento);
    } catch (falha: unknown) {
      // O servidor RESPONDEU (qualquer status): ou recusou antes de cobrar (valor, campanha fechada, termo), ou o Asaas
      // falhou e o Nest já marcou a contribuição como 'erro' e cancelou a cobrança (contribuicao.service.create.ts). Nos
      // dois casos não sobra nada pagável: mostra o motivo dele e deixa tentar de novo. Só a falta de resposta (rede caiu
      // no meio) deixa a dúvida se a cobrança existe.
      if (falha instanceof ErroHttp) {
        setErro(falha.message);
      } else {
        setBloqueado(true);
        setErro(
          'Não foi possível confirmar se a cobrança foi criada. Para não cobrar duas vezes, não tente de novo agora: veja em alguns minutos em Minha Conta > Contribuições, ou fale com o suporte.',
        );
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo="Apoiar esta pesquisa"
      subtitulo={campanha.titulo}
      ajuda="Escolha o valor aqui; o pagamento é feito na página segura do Asaas, o intermediador de pagamento da plataforma."
      aoFechar={aoFechar}
      erro={erro}
      fecharAoClicarFora={false}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          largura="md"
          acao={{
            rotulo: 'Ir para o pagamento',
            rotuloOcupado: 'Gerando a cobrança...',
            ocupado: enviando,
            desabilitado: !podeIr,
            aoClicar: () => void irParaPagamento(),
          }}
        />
      }
    >
      <SecaoFicha titulo="Valor do apoio" colunas={1}>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="group" aria-label="Valores sugeridos">
          {VALORES_SUGERIDOS.map((sugestao) => (
            <button
              type="button"
              key={sugestao}
              aria-pressed={numero === sugestao}
              onClick={() => setValor(sugestao.toFixed(2))}
              className="pilula-valor py-2.5 rounded-lg text-sm font-bold border-2 transition-colors"
            >
              {formatarMoeda(sugestao)}
            </button>
          ))}
        </div>
        <Campo rotulo="Outro valor" erro={erroValor ?? undefined} dica={`Mínimo de ${formatarMoeda(minimo)}.`}>
          {({ atributos, classeErro }) => (
            <InputDinheiro {...atributos} valor={valor} aoMudar={setValor} className={'input-padrao' + classeErro} />
          )}
        </Campo>
      </SecaoFicha>

      {podeCartao && (
        <SecaoFicha titulo="Forma de pagamento" colunas={1}>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Forma de pagamento">
            <label className="flex items-start gap-3 cursor-pointer paragrafo texto-padrao">
              <input type="radio" name="meio-apoio" checked={meio === 'pix'} onChange={() => setMeio('pix')} className="mt-1 accent-primary" />
              <span>
                <span className="enfase texto-forte">Pix</span>
                <span className="block legenda texto-fraco">Confirmado na hora. Tarifa de {formatarMoeda(tarifaPix)}.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer paragrafo texto-padrao">
              <input
                type="radio"
                name="meio-apoio"
                checked={meio === 'cartao_credito'}
                onChange={() => setMeio('cartao_credito')}
                className="mt-1 accent-primary"
              />
              <span>
                <span className="enfase texto-forte">Cartão de crédito</span>
                <span className="block legenda texto-fraco">
                  À vista, de {formatarMoeda(minimoCartao)} a {formatarMoeda(maximoCartao)}. Tarifa de {cartaoPercentual}% +{' '}
                  {formatarMoeda(cartaoFixa)}.
                </span>
              </span>
            </label>
          </div>
        </SecaoFicha>
      )}

      {recompensas.length > 0 && (
        <SecaoFicha titulo="Recompensas" colunas={1}>
          <div className="paragrafo texto-padrao" aria-live="polite">
            {alcancadas.length > 0 ? (
              <p>
                Com {formatarMoeda(numero)}, você ganha{' '}
                <span className="enfase texto-forte">{alcancadas.map((item) => item.titulo).join(', ')}</span>.
              </p>
            ) : (
              <p className="texto-fraco">{valorOk ? 'Este valor ainda não alcança nenhuma recompensa.' : 'Escolha um valor para ver as recompensas que ele alcança.'}</p>
            )}
            {proxima && (
              <button type="button" onClick={() => setValor(proxima.valorMinimo.toFixed(2))} className="link-texto mt-1 text-left">
                Apoiar com {formatarMoeda(proxima.valorMinimo)} e ganhar “{proxima.titulo}”
              </button>
            )}
            {!auth.usuario && (
              <p className="legenda texto-aviso mt-2">
                As recompensas vão só para quem apoia com a conta: <Link to="/login" className="link-texto link-texto--cor-herdada">entre</Link> antes de continuar.
              </p>
            )}
          </div>
        </SecaoFicha>
      )}

      <SecaoFicha titulo="Resumo" colunas={1}>
        <dl className="paragrafo grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
          <dt className="texto-fraco">Apoio (vai para a campanha)</dt>
          <dd className="numero texto-forte text-right">{valorOk ? formatarMoeda(numero) : '—'}</dd>
          <dt className="texto-fraco">Tarifa do {meioUsado === 'pix' ? 'Pix' : 'cartão'} (do intermediador)</dt>
          <dd className="numero texto-padrao text-right">{tarifa === null ? '—' : formatarMoeda(tarifa)}</dd>
          <dt className="enfase texto-forte border-t borda-padrao pt-1">Total a pagar</dt>
          <dd className="numero enfase texto-forte text-right border-t borda-padrao pt-1">{total === null ? '—' : formatarMoeda(total)}</dd>
        </dl>
        <p className="legenda texto-fraco">
          A tarifa é do intermediador de pagamento, não da plataforma. O valor exato aparece na página de pagamento.{' '}
          <Link to="/transparencia" className="link-texto">Ver as taxas</Link>
        </p>
      </SecaoFicha>

      <SecaoFicha titulo="Antes de continuar" colunas={1}>
        {flexivel ? (
          <CaixaAviso titulo="Campanha flexível" icone="fa-triangle-exclamation" espacado>
            <p>
              O valor vai para o pesquisador no fim da campanha, <strong>mesmo que a meta não seja atingida</strong>. Ele só volta
              se a moderação da plataforma encerrar a campanha.
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cienteFlexivel}
                onChange={(evento) => setCienteFlexivel(evento.target.checked)}
                className="mt-1 w-4 h-4 accent-primary"
              />
              <span className="enfase">Entendi que o valor vai para o pesquisador mesmo sem a meta.</span>
            </label>
          </CaixaAviso>
        ) : (
          <p className="paragrafo texto-padrao">
            <span className="enfase texto-forte">Tudo ou Nada:</span> se a meta não for atingida até o fim do prazo, o valor do
            apoio volta para você (a tarifa do intermediador não volta).
          </p>
        )}
        {auth.aceitePendente && (
          <p className="paragrafo texto-erro" role="alert">
            Aceite a versão nova dos Termos de Uso na sua conta antes de apoiar.
          </p>
        )}
        <label className="flex items-start gap-3 cursor-pointer paragrafo texto-padrao">
          <input
            type="checkbox"
            checked={aceitouTermos}
            onChange={(evento) => setAceitouTermos(evento.target.checked)}
            className="mt-1 w-4 h-4 accent-primary"
          />
          <span>
            Li e aceito os{' '}
            <Link to="/termos" target="_blank" className="link-texto">
              Termos de Uso
            </Link>{' '}
            e as condições deste apoio.
          </span>
        </label>
      </SecaoFicha>
    </ModalFicha>
  );
}
