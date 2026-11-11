import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { PropsPagina } from '../../services/router/pagina.type';
import { contribuicaoPublicaApi } from './contribuicao-publica.api';
import type {
  ContribuicaoCriadaPublica,
  StatusContribuicaoPublica,
} from './contribuicao-publica.api';

interface EstadoApoio {
  contribuicao: ContribuicaoCriadaPublica;
  tituloCampanha: string;
  metaFinanceira: number;
  valorBrutoArrecadado: number;
}

const ROTULOS_STATUS: Record<string, string> = {
  pendente: 'Aguardando pagamento',
  confirmado: 'Pagamento confirmado',
  repassado: 'Pagamento confirmado',
  expirado: 'Cobrança expirada',
  erro: 'Cobrança não concluída',
  devolvido: 'Contribuição devolvida',
  reembolsado: 'Contribuição reembolsada',
  a_devolver: 'Devolução em andamento',
  reembolso_manual: 'Reembolso em análise',
};

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function lerEstadoApoio(valor: unknown): EstadoApoio | null {
  if (!ehRegistro(valor) || !ehRegistro(valor.contribuicao)) return null;
  const contribuicao = valor.contribuicao;
  const pix = contribuicao.pix;
  if (
    typeof valor.tituloCampanha !== 'string' ||
    !valor.tituloCampanha ||
    typeof valor.metaFinanceira !== 'number' ||
    !Number.isFinite(valor.metaFinanceira) ||
    valor.metaFinanceira <= 0 ||
    typeof valor.valorBrutoArrecadado !== 'number' ||
    !Number.isFinite(valor.valorBrutoArrecadado) ||
    typeof contribuicao.idContribuicao !== 'number' ||
    !Number.isSafeInteger(contribuicao.idContribuicao) ||
    typeof contribuicao.idCampanha !== 'number' ||
    !Number.isSafeInteger(contribuicao.idCampanha) ||
    typeof contribuicao.tokenSessao !== 'string' ||
    !contribuicao.tokenSessao ||
    contribuicao.status !== 'pendente' ||
    typeof contribuicao.valor !== 'number' ||
    !Number.isFinite(contribuicao.valor) ||
    typeof contribuicao.taxaPagamento !== 'number' ||
    !Number.isFinite(contribuicao.taxaPagamento) ||
    contribuicao.taxaPagamento < 0 ||
    typeof contribuicao.valorCobrado !== 'number' ||
    !Number.isFinite(contribuicao.valorCobrado) ||
    contribuicao.valorCobrado < contribuicao.valor ||
    contribuicao.meioPagamento !== 'pix' ||
    typeof contribuicao.criadoEm !== 'string' ||
    !Number.isFinite(Date.parse(contribuicao.criadoEm)) ||
    !ehRegistro(pix) ||
    typeof pix.copiaECola !== 'string' ||
    !pix.copiaECola ||
    typeof pix.expiraEm !== 'string' ||
    !Number.isFinite(Date.parse(pix.expiraEm))
  ) {
    return null;
  }

  return {
    contribuicao: {
      idContribuicao: contribuicao.idContribuicao,
      idCampanha: contribuicao.idCampanha,
      tokenSessao: contribuicao.tokenSessao,
      valor: contribuicao.valor,
      taxaPagamento: contribuicao.taxaPagamento,
      valorCobrado: contribuicao.valorCobrado,
      meioPagamento: 'pix',
      status: 'pendente',
      criadoEm: contribuicao.criadoEm,
      pix: {
        copiaECola: pix.copiaECola,
        expiraEm: pix.expiraEm,
        ...(typeof pix.qrCodeBase64 === 'string' ? { qrCodeBase64: pix.qrCodeBase64 } : {}),
      },
    },
    tituloCampanha: valor.tituloCampanha,
    metaFinanceira: valor.metaFinanceira,
    valorBrutoArrecadado: valor.valorBrutoArrecadado,
  };
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function imagemQrCode(base64: string | undefined): string | null {
  return base64 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64) ? `data:image/png;base64,${base64}` : null;
}

export function ApoioConfirmado({ auth }: PropsPagina) {
  const localizacao = useLocation();
  const estado = useMemo(() => lerEstadoApoio(localizacao.state), [localizacao.state]);
  const [situacao, setSituacao] = useState<StatusContribuicaoPublica | null>(null);
  const [financeiroAtual, setFinanceiroAtual] = useState<CampanhaResponse | null>(null);
  const [erroConsulta, setErroConsulta] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!estado) return;
    let ativo = true;
    let intervalo: number | undefined;
    let consultando = false;

    const consultarStatus = async (): Promise<void> => {
      if (consultando) return;
      consultando = true;
      try {
        const resultado = await contribuicaoPublicaApi.buscar(
          auth.authFetch,
          estado.contribuicao.idContribuicao,
          estado.contribuicao.tokenSessao,
        );
        if (ativo) {
          setSituacao(resultado);
          setErroConsulta(null);
          if (resultado.status === 'pendente') {
            intervalo = window.setTimeout(() => void consultarStatus(), 15_000);
          }
        }
      } catch (erro: unknown) {
        if (ativo) {
          setErroConsulta(
            erro instanceof Error
              ? erro.message
              : 'Não foi possível consultar a confirmação do pagamento.',
          );
          intervalo = window.setTimeout(() => void consultarStatus(), 15_000);
        }
      } finally {
        consultando = false;
      }
    };

    void consultarStatus();
    return () => {
      ativo = false;
      if (intervalo !== undefined) window.clearTimeout(intervalo);
    };
  }, [auth.authFetch, estado]);

  useEffect(() => {
    if (!estado || (situacao?.status !== 'confirmado' && situacao?.status !== 'repassado')) return;
    let ativo = true;
    campanhaApi
      .buscar(auth.authFetch, estado.contribuicao.idCampanha)
      .then((resultado) => {
        if (ativo) setFinanceiroAtual(resultado);
      })
      .catch(() => {
        if (ativo) setFinanceiroAtual(null);
      });
    return () => {
      ativo = false;
    };
  }, [auth.authFetch, estado, situacao?.status]);

  async function copiarPix(): Promise<void> {
    if (!estado) return;
    try {
      await navigator.clipboard.writeText(estado.contribuicao.pix?.copiaECola ?? '');
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErroConsulta('Não foi possível copiar automaticamente. Selecione e copie o código PIX manualmente.');
    }
  }

  if (!estado) {
    return (
      <main id="view-apoio-confirmado" className="view-section flex-grow fundo-sutil py-16">
        <div className="max-w-xl mx-auto px-4">
          <div className="cartao cartao--grande fundo-cartao rounded-2xl border borda-padrao p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full fundo-aviso flex items-center justify-center texto-aviso" aria-hidden="true">
              <i className="fa-solid fa-circle-exclamation text-2xl" />
            </div>
            <h1 className="titulo-secao mb-2">Acompanhamento indisponível</h1>
            <p className="paragrafo texto-padrao mb-8">
              Não recebemos os dados da cobrança criada nesta sessão. Por segurança, não exibiremos uma confirmação
              nem dados de pagamento presumidos. Volte ao checkout válido da campanha para continuar.
            </p>
            <Link to="/como-funciona" className="btn btn-secondary justify-center">
              Voltar à plataforma
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const status = situacao?.status ?? 'pendente';
  const pagamentoConfirmado = status === 'confirmado' || status === 'repassado';
  const contribuicao = estado.contribuicao;
  const percentual =
    financeiroAtual?.metaFinanceira && financeiroAtual.metaFinanceira > 0
      ? (financeiroAtual.valorBrutoArrecadado / financeiroAtual.metaFinanceira) * 100
      : (estado.valorBrutoArrecadado / estado.metaFinanceira) * 100;
  const percentualLimitado = Math.max(0, Math.min(percentual, 100));
  const arrecadado = financeiroAtual?.valorBrutoArrecadado ?? estado.valorBrutoArrecadado;
  const meta = financeiroAtual?.metaFinanceira ?? estado.metaFinanceira;
  const qrCode = imagemQrCode(contribuicao.pix?.qrCodeBase64);
  const data = Date.parse(contribuicao.criadoEm);

  return (
    <main id="view-apoio-confirmado" className="view-section flex-grow fundo-sutil">
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="cartao cartao--grande fundo-cartao rounded-2xl border borda-padrao shadow-xl p-8 text-center">
          <div
            className={`w-20 h-20 mx-auto mb-6 rounded-full ${pagamentoConfirmado ? 'fundo-sucesso texto-sucesso' : 'fundo-info texto-info'} flex items-center justify-center`}
            aria-hidden="true"
          >
            <i className={`fa-solid ${pagamentoConfirmado ? 'fa-check' : 'fa-clock'} text-2xl`} />
          </div>

          <h1 className="titulo-secao mb-2">
            {pagamentoConfirmado ? 'Pagamento confirmado' : 'Contribuição registrada'}
          </h1>
          <p className="paragrafo texto-padrao mb-1">
            {pagamentoConfirmado
              ? `Sua contribuição de ${formatarMoeda(contribuicao.valor)} foi confirmada.`
              : `Sua contribuição de ${formatarMoeda(contribuicao.valor)} foi registrada e aguarda pagamento.`}
          </p>
          <p className="legenda mb-8">
            {ROTULOS_STATUS[status] ?? 'Situação do pagamento em consulta'} · Protocolo{' '}
            <span className="font-dado">{contribuicao.idContribuicao}</span>
          </p>
          <MensagemErro texto={erroConsulta} />

          {!pagamentoConfirmado && status === 'pendente' && (
            <div className="text-left rounded-xl border borda-padrao p-5 mb-6">
              <p className="rotulo mb-3">Pagamento via PIX</p>
              {qrCode && (
                <img
                  src={qrCode}
                  alt="QR Code PIX fornecido pelo servidor"
                  className="w-56 h-56 mx-auto border borda-padrao p-3 rounded-xl mb-6 fundo-cartao shadow-lg"
                />
              )}
              {!qrCode && (
                <p className="paragrafo texto-padrao mb-4">
                  O servidor não forneceu uma imagem de QR Code válida. Use o código PIX abaixo no aplicativo do seu
                  banco.
                </p>
              )}
              <label htmlFor="pix-copia-cola" className="block rotulo mb-2">
                Pix Copia e Cola
              </label>
              <textarea
                id="pix-copia-cola"
                readOnly
                value={contribuicao.pix?.copiaECola ?? ''}
                rows={4}
                className="input-padrao w-full font-dado text-sm"
              />
              <button type="button" onClick={() => void copiarPix()} className="btn btn-secondary w-full mt-3">
                {copiado ? 'Copiado ✓' : 'Copiar código PIX'}
              </button>
              <p className="legenda mt-4">
                Expira em{' '}
                {contribuicao.pix
                  ? new Date(contribuicao.pix.expiraEm).toLocaleString('pt-BR')
                  : 'data não informada'}
                . O pagamento só será confirmado após atualização do status pelo servidor.
              </p>
            </div>
          )}

          <div className="text-left rounded-xl border borda-padrao overflow-hidden mb-6">
            <div className="fundo-sutil px-5 py-3 border-b borda-padrao">
              <span className="rotulo">Resumo</span>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="texto-fraco">Projeto</span>
                <span className="font-bold texto-forte text-right">{estado.tituloCampanha}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="texto-fraco">Valor</span>
                <span className="numero font-bold texto-forte">{formatarMoeda(contribuicao.valor)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="texto-fraco">Taxa de pagamento</span>
                <span className="numero font-bold texto-forte">{formatarMoeda(contribuicao.taxaPagamento)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="texto-fraco">Total da cobrança</span>
                <span className="numero font-bold texto-forte">{formatarMoeda(contribuicao.valorCobrado)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="texto-fraco">Meio de pagamento</span>
                <span className="texto-padrao">PIX</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="texto-fraco">Data</span>
                <span className="texto-padrao">
                  {Number.isFinite(data) ? new Date(data).toLocaleDateString('pt-BR') : 'Não informada'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-left rounded-xl border borda-padrao p-5 mb-8">
            <p className="rotulo mb-3">Arrecadação atual da campanha</p>
            <div className="flex items-center justify-between mb-2 text-sm font-bold">
              <span className="texto-forte">{formatarMoeda(arrecadado)}</span>
              <span className="texto-fraco">Meta {formatarMoeda(meta)}</span>
            </div>
            <div
              className="w-full fundo-realce rounded-full h-2.5 overflow-hidden"
              role="progressbar"
              aria-valuenow={percentualLimitado}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${percentualLimitado.toFixed(1)}% da meta, conforme os dados atuais da campanha`}
            >
              <div className="bg-primary h-full rounded-full" style={{ width: `${percentualLimitado}%` }} />
            </div>
            <p className="legenda mt-3">
              {pagamentoConfirmado && financeiroAtual
                ? 'Valores consultados na campanha após a confirmação.'
                : pagamentoConfirmado
                  ? 'O pagamento foi confirmado, mas não foi possível atualizar o resumo da campanha.'
                  : 'Valores consultados antes da confirmação desta contribuição; ainda não incluem este apoio.'}
            </p>
          </div>

          <div className="text-left rounded-xl fundo-info p-5 mb-8">
            <p className="rotulo texto-info mb-3">O que acontece agora</p>
            <ol className="space-y-2 text-sm texto-padrao">
              <li className="flex gap-2">
                <span className="font-bold texto-info">1.</span>
                {pagamentoConfirmado
                  ? 'O pagamento foi confirmado pelo servidor.'
                  : 'Pague o PIX e aguarde a atualização automática do status.'}
              </li>
              <li className="flex gap-2">
                <span className="font-bold texto-info">2.</span>
                {pagamentoConfirmado
                  ? 'O pesquisador será notificado do seu apoio.'
                  : 'O pesquisador só será notificado após a confirmação do pagamento.'}
              </li>
              <li className="flex gap-2">
                <span className="font-bold texto-info">3.</span>
                Você pode acompanhar as informações públicas da campanha.
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button type="button" disabled title="Recibo indisponível: a API não fornece geração de recibo." className="btn btn-secondary justify-center disabled:opacity-50">
              <i className="fa-solid fa-file-arrow-down" aria-hidden="true" /> Recibo indisponível
            </button>
            <button
              type="button"
              disabled
              title="A página pública da campanha ainda não está disponível nesta versão."
              className="btn btn-secondary justify-center disabled:opacity-50"
            >
              <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" /> Acompanhar indisponível
            </button>
            <Link to="/como-funciona" className="btn btn-primary justify-center">
              <i className="fa-solid fa-compass" aria-hidden="true" /> Como funciona
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
