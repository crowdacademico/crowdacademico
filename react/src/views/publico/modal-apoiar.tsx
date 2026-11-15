import { useEffect, useRef, useState } from 'react';
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
import { guardarApoio, useSituacaoApoio, type ApoioEmAndamento } from './apoio-em-andamento';
import { PainelPix } from './painel-pix';

const VALORES_SUGERIDOS = [25, 50, 100, 150, 200];
// Valor já marcado ao abrir (o padrão dos formulários de doação: começar pelo apoio médio, e o resumo nunca nasce vazio).
const VALOR_PADRAO = 50;
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

interface OpcaoMeio {
  meio: MeioApoioPublico;
  rotulo: string;
  icone: string;
  detalhe: string;
  // Por que não dá para usar este meio agora (null = dá).
  indisponivel: string | null;
}

const centavos = (valor: number) => Math.round(valor * 100) / 100;

function ehProvedorTeste(link: string | undefined): boolean {
  if (!link) return false;
  try {
    return new URL(link).hostname === 'fake.local';
  } catch {
    return false;
  }
}

// "Apoiar esta pesquisa" (16-11-2026, decisões do Lucas): a pessoa escolhe o valor e a forma de pagamento e vê o total.
// - Pix: "Gerar Pix" mostra o QR, o "copia e cola" e a contagem aqui mesmo (PainelPix), e a situação atualiza sozinha.
// - Cartão e boleto: a pessoa vai para a página do Asaas (o cartão é digitado lá; o sistema nunca vê o número). A volta
//   cai em /apoio-confirmado (ver apoio-em-andamento.ts).
// Todas as formas aparecem sempre; as que não valem para aquela pessoa e campanha ficam apagadas, com o motivo.
//
// As regras continuam no banco (trigger de contribuição, 05): valor mínimo, Tudo ou Nada só Pix, sem conta só Pix, faixa e
// interruptor do cartão, interruptor do boleto. Aqui elas só decidem o que mostrar, para a pessoa não esbarrar num erro.
export function ModalApoiar({ auth, campanha, recompensas, valorInicial, aoFechar }: ModalApoiarProps) {
  const navigate = useNavigate();
  const { obterNumero, obterConfiguracao } = useConfiguracoes();
  const minimo = obterNumero('valor_minimo_contribuicao', 5);
  const tarifaPix = obterNumero('taxa_pagamento_pix', 1.99);
  const cartaoLigado = String(obterConfiguracao('cartao_habilitado', true)) === 'true';
  const boletoLigado = String(obterConfiguracao('boleto_habilitado', false)) === 'true';
  const minimoCartao = obterNumero('valor_minimo_contribuicao_cartao', 20);
  const maximoCartao = obterNumero('valor_maximo_contribuicao_cartao', 500);
  const cartaoPercentual = obterNumero('taxa_cartao_percentual', 1.99);
  const cartaoFixa = obterNumero('taxa_cartao_fixa', 0.49);
  const tarifaBoleto = obterNumero('taxa_pagamento_boleto', 1.99);
  const diasBoleto = obterNumero('boleto_vencimento_dias', 3);

  const flexivel = campanha.modelo === 'flexivel';
  // Entrar na conta a partir do modal volta para cá, com o modal aberto e o mesmo valor.
  const voltarAoApoio = `/campanha/${campanha.idCampanha}?apoiar=1`;
  // Formas de pagamento (heurísticas de Nielsen, 16-11-2026, Lucas): o que a pessoa NÃO pode resolver some (campanha Tudo
  // ou Nada, meio desligado pela plataforma), e a Tudo ou Nada ganha uma explicação explícita de por que é só Pix; o que
  // ela PODE resolver (entrar na conta) aparece apagado, com o caminho. As regras continuam no banco
  // (validar_contribuicao_all_or_nothing e fn_valida_contribuicao_valor_minimo, 05).
  const pedeConta = (nome: string) => (auth.usuario ? null : `Entre na sua conta para pagar com ${nome}.`);
  const todas: (OpcaoMeio & { visivel: boolean })[] = [
    { meio: 'pix', rotulo: 'Pix', icone: 'fa-brands fa-pix', detalhe: `Confirmado na hora. Tarifa de ${formatarMoeda(tarifaPix)}.`, indisponivel: null, visivel: true },
    {
      meio: 'cartao_credito',
      rotulo: 'Cartão de crédito',
      icone: 'fa-regular fa-credit-card',
      detalhe: `À vista, de ${formatarMoeda(minimoCartao)} a ${formatarMoeda(maximoCartao)}, na página segura do Asaas. Tarifa de ${cartaoPercentual}% + ${formatarMoeda(cartaoFixa)}.`,
      indisponivel: pedeConta('cartão'),
      visivel: cartaoLigado && flexivel,
    },
    {
      meio: 'boleto',
      rotulo: 'Boleto',
      icone: 'fa-solid fa-barcode',
      detalhe: `Vence em ${diasBoleto} dias; confirmado cerca de 1 dia útil depois de pago. Tarifa de ${formatarMoeda(tarifaBoleto)}.`,
      indisponivel: pedeConta('boleto'),
      visivel: boletoLigado && flexivel,
    },
  ];
  const opcoes: OpcaoMeio[] = todas.filter((opcao) => opcao.visivel);
  const algumaPedeConta = opcoes.some((opcao) => opcao.indisponivel !== null);

  const [valor, setValor] = useState((valorInicial && valorInicial > 0 ? valorInicial : VALOR_PADRAO).toFixed(2));
  const [meio, setMeio] = useState<MeioApoioPublico>('pix');
  const [cienteFlexivel, setCienteFlexivel] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | undefined>(undefined);
  // Falha sem resposta clara (rede, servidor): pode ter criado a cobrança; não deixa tentar de novo daqui.
  const [bloqueado, setBloqueado] = useState(false);
  // Clicou no botão com algo faltando: a mensagem do que falta fica em vermelho, e o foco vai até o item.
  const [insistiu, setInsistiu] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);
  const cienciaRef = useRef<HTMLInputElement>(null);
  const termosRef = useRef<HTMLInputElement>(null);
  // Pix gerado: o modal passa a mostrar o QR e a situação.
  const [apoioPix, setApoioPix] = useState<ApoioEmAndamento | null>(null);
  const situacao = useSituacaoApoio(auth.authFetch, apoioPix);

  // Voltar da página do Asaas (cartão, boleto): o navegador pode restaurar esta página da memória (cache de voltar/avançar),
  // com o modal parado em "Gerando a cobrança..." e o endereço já trocado para /apoio-confirmado. Recarrega.
  useEffect(() => {
    const aoMostrar = (evento: PageTransitionEvent) => {
      if (evento.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', aoMostrar);
    return () => window.removeEventListener('pageshow', aoMostrar);
  }, []);

  const numero = Number(valor);
  const meioUsado: MeioApoioPublico = opcoes.find((opcao) => opcao.meio === meio)?.indisponivel ? 'pix' : meio;
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
      : meioUsado === 'boleto'
        ? tarifaBoleto
        : centavos(Math.ceil(((numero + cartaoFixa) / (1 - cartaoPercentual / 100)) * 100) / 100 - numero);
  const total = tarifa === null ? null : centavos(numero + tarifa);
  const nomeMeio = meioUsado === 'pix' ? 'Pix' : meioUsado === 'boleto' ? 'boleto' : 'cartão';

  const alcancadas = valorOk ? recompensas.filter((item) => item.valorMinimo <= numero) : [];
  const proxima = recompensas.find((item) => !valorOk || item.valorMinimo > numero);

  const podeIr = valorOk && aceitouTermos && (!flexivel || cienteFlexivel) && !auth.aceitePendente && !enviando && !bloqueado;
  // O que falta para o botão ligar, dito embaixo dos Termos (botão apagado sem explicação parece quebrado).
  const falta = !valorOk
    ? 'Escolha um valor válido para continuar.'
    : flexivel && !cienteFlexivel
      ? 'Confirme que entendeu a campanha flexível para continuar.'
      : !aceitouTermos
        ? 'Aceite os Termos de Uso para continuar.'
        : null;
  // O botão parece apagado, mas o clique responde: leva a pessoa até o que falta (o padrão .btn[aria-disabled] do sistema).
  const mostrarFalta = () => {
    setInsistiu(true);
    const alvo = !valorOk ? valorRef.current : flexivel && !cienteFlexivel ? cienciaRef.current : termosRef.current;
    alvo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    alvo?.focus({ preventScroll: true });
  };

  const continuar = async () => {
    if (!podeIr) return;
    setEnviando(true);
    setErro(undefined);
    try {
      const criada = await contribuicaoPublicaApi.criar(auth.authFetch, {
        idCampanha: campanha.idCampanha,
        valor: numero,
        meioPagamento: meioUsado,
        aceiteTermos: true,
        ...(flexivel ? { cienteModeloFlexivel: true } : {}),
      });
      const link = meioUsado === 'boleto' ? criada.boleto?.link : criada.linkPagamento;
      const apoio: ApoioEmAndamento = {
        idContribuicao: criada.idContribuicao,
        tokenSessao: criada.tokenSessao,
        idCampanha: campanha.idCampanha,
        tituloCampanha: campanha.titulo,
        valor: criada.valor,
        taxaPagamento: criada.taxaPagamento,
        valorCobrado: criada.valorCobrado,
        meioPagamento: criada.meioPagamento,
        criadoEm: criada.criadoEm,
        linkPagamento: link ?? '',
        pix: criada.pix,
        provedorTeste: ehProvedorTeste(link),
      };
      if (meioUsado === 'pix') {
        if (!criada.pix) {
          setBloqueado(true);
          setErro('O Pix foi registrado, mas o código não veio. Não tente de novo agora; fale com o suporte.');
          return;
        }
        guardarApoio(apoio);
        setApoioPix(apoio);
        return;
      }
      if (!link) {
        setBloqueado(true);
        setErro('A cobrança foi registrada, mas a página de pagamento não veio. Não tente de novo agora; fale com o suporte.');
        return;
      }
      guardarApoio(apoio);
      if (apoio.provedorTeste) {
        void navigate('/apoio-confirmado');
        return;
      }
      // O "voltar" do navegador, na página do Asaas, cai no acompanhamento (e não de novo neste modal).
      window.history.replaceState(null, '', '/apoio-confirmado');
      window.location.assign(link);
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

  // ---------- Depois de gerar o Pix ----------
  if (apoioPix?.pix) {
    const confirmado = situacao.status === 'confirmado' || situacao.status === 'repassado';
    const naoConcluido = situacao.status === 'expirado' || situacao.status === 'erro';
    return (
      <ModalFicha
        titulo={confirmado ? 'Obrigado pelo apoio!' : 'Pague com Pix'}
        subtitulo={campanha.titulo}
        aoFechar={aoFechar}
        erro={situacao.erro ?? undefined}
        fecharAoClicarFora={false}
        rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
      >
        <SecaoFicha titulo={`Total: ${formatarMoeda(apoioPix.valorCobrado)}`} colunas={1}>
          {confirmado ? (
            <div className="fundo-sucesso texto-sucesso rounded-xl p-5 text-center" role="status">
              <i className="fa-solid fa-circle-check text-3xl mb-2" aria-hidden="true" />
              <p className="paragrafo enfase">Pagamento confirmado. Seu apoio de {formatarMoeda(apoioPix.valor)} já conta para a meta.</p>
            </div>
          ) : naoConcluido ? (
            <CaixaAviso titulo="O pagamento não foi concluído" tom="aviso">
              <p>Nenhum valor foi cobrado por este Pix. Feche e apoie de novo, se quiser.</p>
            </CaixaAviso>
          ) : (
            <>
              <PainelPix pix={apoioPix.pix} linkPagamento={apoioPix.provedorTeste ? undefined : apoioPix.linkPagamento} />
              {apoioPix.provedorTeste && (
                <p className="legenda texto-info fundo-info rounded-lg p-3">
                  Provedor de pagamento de TESTE: confirme o pagamento de mentira pela T5 do Campo de Testes.
                </p>
              )}
              <p className="legenda texto-fraco text-center" role="status">
                Aguardando o pagamento. Esta janela atualiza sozinha quando ele for confirmado.
              </p>
            </>
          )}
          <p className="legenda texto-fraco text-center">
            Protocolo <span className="font-dado">{apoioPix.idContribuicao}</span>. Se fechar esta janela, o Pix continua valendo:{' '}
            <Link to="/apoio-confirmado" className="link-texto">
              ver o apoio em andamento
            </Link>
            .
          </p>
        </SecaoFicha>
      </ModalFicha>
    );
  }

  // ---------- Escolha do valor e da forma ----------
  return (
    <ModalFicha
      titulo="Apoiar esta pesquisa"
      subtitulo={campanha.titulo}
      ajuda="Pix: o QR aparece aqui mesmo. Cartão e boleto: o pagamento é na página segura do Asaas, o intermediador de pagamento da plataforma."
      aoFechar={aoFechar}
      erro={erro}
      fecharAoClicarFora={false}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          largura="md"
          acao={{
            rotulo: (meioUsado === 'pix' ? 'Gerar Pix' : 'Ir para o pagamento') + (total === null ? '' : ` · ${formatarMoeda(total)}`),
            rotuloOcupado: 'Gerando a cobrança...',
            ocupado: enviando,
            // Desligado de verdade só enquanto envia ou quando não dá para tentar de novo; o resto é "falta algo".
            desabilitado: enviando || bloqueado || auth.aceitePendente,
            aparenciaIndisponivel: !podeIr,
            dica: falta ?? undefined,
            aoClicar: () => (falta ? mostrarFalta() : void continuar()),
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
              className="pilula-valor py-2.5 rounded-lg text-sm font-bold border-2 transition-colors inline-flex items-center justify-center gap-2"
            >
              {formatarMoeda(sugestao)}
              {numero === sugestao && <i className="fa-solid fa-circle-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
        <Campo rotulo="Outro valor" erro={erroValor ?? undefined} dica={`Mínimo de ${formatarMoeda(minimo)}.`}>
          {({ atributos, classeErro }) => (
            <InputDinheiro {...atributos} ref={valorRef} valor={valor} aoMudar={setValor} placeholder="R$ 0,00" className={'input-padrao' + classeErro} />
          )}
        </Campo>
      </SecaoFicha>

      <SecaoFicha titulo="Forma de pagamento" colunas={1}>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Forma de pagamento">
          {opcoes.map((opcao) => {
            const escolhida = meioUsado === opcao.meio;
            return (
              <label
                key={opcao.meio}
                className="opcao-pagamento"
                data-escolhida={escolhida ? '' : undefined}
                data-indisponivel={opcao.indisponivel ? '' : undefined}
              >
                <input
                  type="radio"
                  name="meio-apoio"
                  checked={escolhida}
                  disabled={opcao.indisponivel !== null}
                  onChange={() => setMeio(opcao.meio)}
                  className="sr-only"
                />
                <i className={opcao.icone + ' opcao-pagamento__icone'} aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block enfase texto-forte">{opcao.rotulo}</span>
                  <span className="block legenda texto-fraco">{opcao.indisponivel ?? opcao.detalhe}</span>
                </span>
                {escolhida && <i className="fa-solid fa-circle-check texto-marca text-lg" aria-hidden="true" />}
                {opcao.indisponivel && (
                  <span className="legenda texto-fraco inline-flex items-center gap-1.5 shrink-0">
                    Requer conta <i className="fa-solid fa-lock" aria-hidden="true" />
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {!flexivel && (
          <CaixaAviso titulo="Esta campanha aceita só Pix" tom="info">
            <p>
              Ela é <strong>Tudo ou Nada</strong>: se a meta não for atingida até o fim do prazo, o valor do apoio volta para você
              (a tarifa do intermediador não volta). O Pix é o único meio que devolve o dinheiro sozinho e na hora.
            </p>
          </CaixaAviso>
        )}
        {algumaPedeConta && (
          <p className="legenda texto-fraco">
            Cartão e boleto pedem uma conta, para a devolução e as recompensas chegarem a você.{' '}
            <Link to="/login" state={{ voltarPara: voltarAoApoio }} className="link-texto">
              Entrar
            </Link>
          </p>
        )}
      </SecaoFicha>

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
            {auth.usuario && alcancadas.length > 0 && (
              <p className="legenda texto-fraco mt-2">
                {flexivel
                  ? 'Liberadas assim que o pagamento for confirmado. Você recebe um e-mail e elas ficam em Minha Conta.'
                  : 'Liberadas quando a campanha bater a meta. Você recebe um e-mail e elas ficam em Minha Conta.'}
              </p>
            )}
            {!auth.usuario && (
              <p className="legenda texto-aviso mt-2">
                As recompensas vão só para quem apoia com a conta: <Link to="/login" state={{ voltarPara: voltarAoApoio }} className="link-texto link-texto--cor-herdada">entre</Link> antes de continuar.
              </p>
            )}
          </div>
        </SecaoFicha>
      )}

      <SecaoFicha titulo="Resumo" colunas={1}>
        <dl className="paragrafo grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 fundo-sutil border borda-padrao rounded-xl p-4">
          <dt className="texto-fraco">Apoio (vai para a campanha)</dt>
          <dd className="numero texto-forte text-right">{valorOk ? formatarMoeda(numero) : '—'}</dd>
          <dt className="texto-fraco">Tarifa do {nomeMeio} (do intermediador)</dt>
          <dd className="numero texto-padrao text-right">{tarifa === null ? '—' : formatarMoeda(tarifa)}</dd>
          <dt className="enfase texto-forte border-t borda-padrao pt-2 mt-1">Total a pagar</dt>
          <dd className="numero enfase texto-forte text-right border-t borda-padrao pt-2 mt-1">{total === null ? '—' : formatarMoeda(total)}</dd>
        </dl>
        <p className="legenda texto-fraco">
          A tarifa é do intermediador de pagamento, não da plataforma; o valor exato aparece ao gerar a cobrança.{' '}
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
                ref={cienciaRef}
                checked={cienteFlexivel}
                onChange={(evento) => setCienteFlexivel(evento.target.checked)}
                className="mt-1 w-4 h-4 accent-primary"
              />
              <span className="enfase">Entendi que o valor vai para o pesquisador mesmo sem a meta.</span>
            </label>
          </CaixaAviso>
        ) : null}
        {auth.aceitePendente && (
          <p className="paragrafo texto-erro" role="alert">
            Aceite a versão nova dos Termos de Uso na sua conta antes de apoiar.
          </p>
        )}
        <label className="flex items-start gap-3 cursor-pointer paragrafo texto-padrao">
          <input
            type="checkbox"
            ref={termosRef}
            checked={aceitouTermos}
            onChange={(evento) => setAceitouTermos(evento.target.checked)}
            className="mt-1 w-4 h-4 accent-primary"
          />
          <span>
            Li e aceito os{' '}
            <Link to="/termos" target="_blank" className="link-texto">
              Termos de Uso<span className="sr-only"> (abre em outra aba)</span>
            </Link>{' '}
            e as condições deste apoio.
          </span>
        </label>
        {falta && !enviando && (
          <p className={insistiu ? 'legenda enfase texto-erro' : 'legenda texto-fraco'} role="status">
            {falta}
          </p>
        )}
      </SecaoFicha>
    </ModalFicha>
  );
}
