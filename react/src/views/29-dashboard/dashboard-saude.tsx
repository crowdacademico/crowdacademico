import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PontoStatusConexao } from './dashboard';
import { Tooltip } from '../../components/layout/tooltip';
import { dashboardApi } from '../../services/29-dashboard/api/dashboard.api';
import type { DashboardResponseHealth, DashboardResponseSummary } from '../../services/29-dashboard/type/dashboard.type';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarDataHora, formatarMoeda } from '../../services/constant/util/formatacao.util';
import { MensagemErro } from '../../components/crud/mensagem-erro';

interface DashboardSaudeProps {
  auth: UseAuthReturn;
  bancoConectado: boolean | null;
  resumo: DashboardResponseSummary | null;
}

// Nome do provedor para gente (o código vem do Nest: notificacao.provedor, contribuicao.provedor).
const NOME_PROVEDOR: Record<string, string> = {
  asaas: 'Asaas',
  fake: 'Provedor de teste',
  brevo: 'Brevo',
  smtp: 'SMTP',
  nao_configurado: 'Não configurado',
};
const nomeProvedor = (codigo: string) => NOME_PROVEDOR[codigo] ?? codigo;

const NOME_AMBIENTE: Record<NonNullable<DashboardResponseHealth['pagamento']['ambiente']>, string> = {
  sandbox: 'Sandbox',
  producao: 'Produção',
  teste: 'Teste',
};

// Situação com a bolinha: verde (ok), vermelha (falhou, com o motivo) ou cinza (verificando).
function Situacao({ estado, falha, children }: { estado: boolean | null; falha?: string; children?: ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <PontoStatusConexao valor={estado} />
      <span className={'enfase ' + (estado === false ? 'texto-erro' : 'texto-padrao')}>
        {estado === null ? 'Verificando…' : estado ? 'Conectado' : (falha ?? 'Sem conexão')}
      </span>
      {children}
    </span>
  );
}

// Uma linha do cartão: o serviço à esquerda (o tipo, e embaixo qual está em uso) e a situação à direita.
function Linha({ rotulo, emUso, children }: { rotulo: string; emUso?: ReactNode; children: ReactNode }) {
  return (
    <div className="py-4 first:pt-0 last:pb-0 grid grid-cols-1 sm:grid-cols-[16rem_1fr] gap-x-6 gap-y-2">
      <div>
        <div className="rotulo-leitura">{rotulo}</div>
        {emUso && <div className="paragrafo enfase texto-forte mt-0.5">{emUso}</div>}
      </div>
      <div className="paragrafo texto-herdado space-y-1">{children}</div>
    </div>
  );
}

// Aba "Saúde": um cartão só, com os três serviços de que o sistema depende, conferidos na hora (16-11-2026). O banco vem da
// mesma checagem da Visão Geral (GET /health); o provedor de pagamento e o de e-mail vêm de GET /dashboard/saude, que fala
// com cada um sem cobrar nem enviar nada. Os avisos (webhooks) do provedor saíram (Lucas): o que pede ação já está em
// "Precisa da sua atenção" (eventos de pagamento em revisão). Não mostra "última migration aplicada": o projeto
// não tem tabela de controle de migration, e um dado fabricado seria pior que nada.
export function DashboardSaude({ auth, bancoConectado, resumo }: DashboardSaudeProps) {
  const { dado: saude, carregando, erro, recarregar } = useBuscar(() => dashboardApi.verificarServicos(auth.authFetch), [], {
    mostraTexto: true,
  });
  const pronto = !carregando && saude !== null;

  return (
    <div className="cartao-painel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="subtitulo">Conexões</h2>
          {pronto && <p className="legenda texto-fraco">Verificado em {formatarDataHora(saude.verificadoEm, true)}</p>}
        </div>
        <button type="button" className="btn btn-secondary" onClick={recarregar} disabled={carregando}>
          <i className="fa-solid fa-rotate" aria-hidden="true" /> Verificar de novo
        </button>
      </div>
      <MensagemErro texto={erro} className="crud-erro" />

      <div className="divide-y divide-[var(--cor-borda)]">
        <Linha rotulo="Banco de dados">
          <Situacao estado={bancoConectado} falha="Sem conexão (GET /health falhou)">
            {bancoConectado && <span className="texto-fraco">(GET /health respondeu 200)</span>}
          </Situacao>
        </Linha>

        <Linha
          rotulo="Provedor de pagamento"
          emUso={saude && `${nomeProvedor(saude.pagamento.provedor)}${saude.pagamento.ambiente ? ` · ${NOME_AMBIENTE[saude.pagamento.ambiente]}` : ''}`}
        >
          <Situacao estado={pronto ? saude.pagamento.ok : null} falha={saude?.pagamento.mensagem} />
          {pronto && saude.pagamento.saldo !== null && (
            <p className="texto-fraco">
              Saldo: <strong className="texto-forte">{formatarMoeda(saude.pagamento.saldo)}</strong>
            </p>
          )}
        </Linha>

        <Linha
          rotulo="Provedor de e-mail"
          emUso={
            saude && (
              <>
                {nomeProvedor(saude.email.provedor)}
                {saude.email.redirecionado && (
                  <span className="badge badge-neutro ml-2 align-middle">
                    Modo de teste <Tooltip texto="Todos os e-mails do sistema estão indo para um único endereço de teste." />
                  </span>
                )}
              </>
            )
          }
        >
          <Situacao estado={pronto ? saude.email.ok : null} falha={saude?.email.mensagem} />
          {resumo && (
            <p className="texto-fraco">
              <strong className="texto-forte">{resumo.notificacoesPendentes}</strong> na fila ·{' '}
              <strong className={resumo.notificacoesComFalha > 0 ? 'texto-erro' : 'texto-forte'}>{resumo.notificacoesComFalha}</strong> com falha ·{' '}
              <Link to="/admin/notificacoes" className="link-texto">
                Ver notificações
              </Link>
            </p>
          )}
        </Linha>
      </div>
    </div>
  );
}
