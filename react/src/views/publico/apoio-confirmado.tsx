import { useState } from 'react';
import { Link } from 'react-router';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import type { PropsPagina } from '../../services/router/pagina.type';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import type { StatusContribuicao } from '../../services/constant/type/enums-do-banco.gerado';
import { lerApoio, useSituacaoApoio } from './apoio-em-andamento';
import { PainelPix } from './painel-pix';

const ROTULOS_STATUS: Record<StatusContribuicao, string> = {
  pendente: 'Aguardando pagamento',
  confirmado: 'Pagamento confirmado',
  repassado: 'Pagamento confirmado',
  expirado: 'Cobrança expirada',
  erro: 'Cobrança não concluída',
  devolvido: 'Apoio devolvido',
  reembolsado: 'Apoio reembolsado',
  a_devolver: 'Devolução em andamento',
  reembolso_manual: 'Reembolso em análise',
};

// O apoio em andamento nesta aba (apoio-em-andamento.ts): o Pix gerado no modal Apoiar (o mesmo QR, depois de fechar o
// modal ou dar F5), ou a volta da página do Asaas no cartão e no boleto (pelo "voltar" do navegador ou pelo retorno
// automático, ASAAS_URL_RETORNO no Nest). A situação é consultada a cada 15 s enquanto o pagamento não chega: quem confirma
// é o aviso do Asaas (webhook), nunca esta tela.
export function ApoioConfirmado({ auth }: PropsPagina) {
  const [apoio] = useState(lerApoio);
  const { status, erro: erroConsulta } = useSituacaoApoio(auth.authFetch, apoio);
  const { obterNumero, obterConfiguracao } = useConfiguracoes();
  const prazoDesistencia = obterNumero('desistencia_prazo_dias', 7);
  const emailSuporte = String(obterConfiguracao('email_suporte', 'o e-mail de suporte') ?? 'o e-mail de suporte');

  if (!apoio) {
    return (
      <div id="view-apoio-confirmado" className="view-section flex-grow fundo-sutil py-16">
        <div className="max-w-xl mx-auto px-4">
          <div className="cartao cartao--grande fundo-cartao rounded-2xl border borda-padrao p-8 text-center">
            <h1 className="titulo-secao mb-2">Nenhum apoio em andamento</h1>
            <p className="paragrafo texto-padrao mb-8">
              {auth.usuario
                ? 'Os seus apoios, com a situação de cada pagamento, ficam em Minha Conta.'
                : 'Esta aba não tem um apoio em andamento. Se você apoiou sem conta, guarde o comprovante do pagamento.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {auth.usuario && (
                <Link to="/minha-conta/contribuicoes" className="btn btn-primary">
                  Minhas contribuições
                </Link>
              )}
              <Link to="/explorar" className="btn btn-secondary">
                Explorar projetos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const confirmado = status === 'confirmado' || status === 'repassado';
  const naoConcluido = status === 'expirado' || status === 'erro';
  const data = Date.parse(apoio.criadoEm);

  return (
    <div id="view-apoio-confirmado" className="view-section flex-grow fundo-sutil">
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="cartao cartao--grande fundo-cartao rounded-2xl border borda-padrao shadow-xl p-8 text-center">
          <div
            className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
              confirmado ? 'fundo-sucesso texto-sucesso' : naoConcluido ? 'fundo-aviso texto-aviso' : 'fundo-info texto-info'
            }`}
            aria-hidden="true"
          >
            <i className={`fa-solid ${confirmado ? 'fa-check' : naoConcluido ? 'fa-circle-exclamation' : 'fa-clock'} text-2xl`} />
          </div>
          <h1 className="titulo-secao mb-2">
            {confirmado ? 'Obrigado pelo apoio!' : naoConcluido ? 'O pagamento não foi concluído' : 'Aguardando o pagamento'}
          </h1>
          <p className="paragrafo texto-padrao mb-1">
            {confirmado
              ? `Seu apoio de ${formatarMoeda(apoio.valor)} a "${apoio.tituloCampanha}" foi confirmado.`
              : naoConcluido
                ? 'Nenhum valor foi cobrado por esta cobrança. Você pode apoiar de novo.'
                : apoio.pix
                  ? 'Pague o Pix abaixo. Esta tela atualiza sozinha quando o pagamento for confirmado.'
                  : 'Se você já pagou na página do Asaas, a confirmação chega em instantes. Esta tela atualiza sozinha.'}
          </p>
          <p className="legenda texto-fraco mb-6" role="status">
            {ROTULOS_STATUS[status]} · Protocolo <span className="font-dado">{apoio.idContribuicao}</span>
          </p>
          <MensagemErro texto={erroConsulta} />

          {status === 'pendente' && apoio.pix && (
            <div className="mb-6">
              <PainelPix pix={apoio.pix} linkPagamento={apoio.provedorTeste ? undefined : apoio.linkPagamento} />
            </div>
          )}
          {status === 'pendente' &&
            (apoio.provedorTeste ? (
              <p className="paragrafo fundo-info texto-info rounded-xl p-4 mb-6 text-left">
                Provedor de pagamento de TESTE: a cobrança foi criada sem sair do site. Confirme o pagamento de mentira pela T5 do
                Campo de Testes.
              </p>
            ) : (
              !apoio.pix &&
              apoio.linkPagamento && (
                <a href={apoio.linkPagamento} className="btn btn-primary w-full justify-center mb-6">
                  Voltar à página de pagamento
                </a>
              )
            ))}
          {naoConcluido && (
            <Link
              to={`/campanha/${apoio.idCampanha}?apoiar=1&valor=${apoio.valor}`}
              className="btn btn-primary w-full justify-center mb-6"
            >
              Apoiar de novo
            </Link>
          )}

          {/* CDC, art. 49: quem apoiou com conta desiste pela Minha Conta; sem conta, só pelo suporte, com o protocolo. */}
          <div className="text-left rounded-xl border borda-padrao fundo-sutil p-4 mb-6 text-sm texto-padrao" role="note">
            <p className="font-semibold texto-forte mb-1">
              Guarde o protocolo <span className="font-dado">{apoio.idContribuicao}</span>
            </p>
            <p className="leading-relaxed">
              {auth.usuario
                ? `Até ${prazoDesistencia} dias depois de apoiar, você pode desistir e receber o valor de volta em Minha Conta (a tarifa do meio de pagamento não volta).`
                : `Até ${prazoDesistencia} dias depois de apoiar, você pode desistir e receber o valor de volta pelo suporte (${emailSuporte}), informando este protocolo e o comprovante do pagamento. A tarifa do meio de pagamento não volta.`}
            </p>
          </div>

          <dl className="text-left rounded-xl border borda-padrao p-5 mb-8 text-sm grid grid-cols-[1fr_auto] gap-x-4 gap-y-2">
            <dt className="texto-fraco">Projeto</dt>
            <dd className="font-bold texto-forte text-right">{apoio.tituloCampanha}</dd>
            <dt className="texto-fraco">Apoio</dt>
            <dd className="numero font-bold texto-forte text-right">{formatarMoeda(apoio.valor)}</dd>
            <dt className="texto-fraco">Tarifa do meio de pagamento</dt>
            <dd className="numero texto-padrao text-right">{formatarMoeda(apoio.taxaPagamento)}</dd>
            <dt className="texto-fraco">Total da cobrança</dt>
            <dd className="numero font-bold texto-forte text-right">{formatarMoeda(apoio.valorCobrado)}</dd>
            <dt className="texto-fraco">Meio de pagamento</dt>
            <dd className="texto-padrao text-right">{ROTULO_MEIO_PAGAMENTO[apoio.meioPagamento]}</dd>
            <dt className="texto-fraco">Data</dt>
            <dd className="texto-padrao text-right">{Number.isFinite(data) ? new Date(data).toLocaleDateString('pt-BR') : '—'}</dd>
          </dl>

          <div className="flex flex-wrap justify-center gap-3">
            <Link to={`/campanha/${apoio.idCampanha}`} className="btn btn-secondary">
              Ver a campanha
            </Link>
            {auth.usuario && (
              <Link to="/minha-conta/contribuicoes" className="btn btn-secondary">
                Minhas contribuições
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
