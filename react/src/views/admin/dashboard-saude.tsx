import { Tooltip } from '../../components/layout/tooltip';
import { PontoStatusConexao, TEXTO_TOOLTIP_SESSOES_ATIVAS } from './dashboard';
import type { DashboardResponseSummary } from '../../services/admin/type/dashboard.type';

interface DashboardSaudeProps {
  bancoConectado: boolean | null;
  resumo: DashboardResponseSummary | null;
}

// Aba "Saúde": recebe o mesmo estado que a faixa de saúde da Visão Geral já calcula (não refaz a requisição).
// Não mostra "última migration aplicada": o projeto não tem uma tabela de controle de migration em uso (o
// histórico de mudança de schema vive nos arquivos numerados 01-08 + `ATUALIZAR O SUPABASE.sql`). Mostrar um
// dado fabricado seria pior que não mostrar nada.
export function DashboardSaude({ bancoConectado, resumo }: DashboardSaudeProps) {
  return (
    <div className="space-y-4">
      <div className="fundo-cartao border borda-forte rounded-xl shadow-sm p-5">
        <h3 className="subtitulo mb-3">Conexão com o banco</h3>
        <div className="flex items-center gap-2 text-sm">
          <PontoStatusConexao valor={bancoConectado} />
          <span className="texto-padrao font-semibold">
            {bancoConectado === null
              ? 'Verificando...'
              : bancoConectado
                ? 'Conectado (GET /health respondeu 200)'
                : 'Sem conexão (GET /health falhou)'}
          </span>
        </div>
      </div>

      <div className="fundo-cartao border borda-forte rounded-xl shadow-sm p-5">
        <h3 className="subtitulo mb-3">Contagens agregadas</h3>
        {resumo ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <p className="texto-fraco">
              Sessões ativas
              <Tooltip texto={TEXTO_TOOLTIP_SESSOES_ATIVAS} />
              <strong className="texto-forte block">{resumo.sessoesAtivas}</strong>
            </p>
            <p className="texto-fraco">
              Usuários <strong className="texto-forte block">{resumo.totalUsuarios}</strong>
            </p>
            <p className="texto-fraco">
              Configurações <strong className="texto-forte block">{resumo.totalConfiguracoes}</strong>
            </p>
          </div>
        ) : (
          <p className="text-sm texto-fraco">Sem dados agregados carregados.</p>
        )}
      </div>

      <div className="rounded-lg border borda-padrao fundo-sutil p-4">
        <p className="text-xs texto-fraco">
          <i className="fa-solid fa-circle-info mr-1"></i>
          Rastreamento de versão de schema (última migration aplicada, divergência de hash)
          ainda não existe neste projeto, o histórico de mudança de banco vive nos arquivos
          numerados (01-08) e em "ATUALIZAR O SUPABASE.sql", não numa tabela de controle
          formal.
        </p>
      </div>
    </div>
  );
}
