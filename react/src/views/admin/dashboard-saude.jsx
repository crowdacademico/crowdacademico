import { Tooltip } from '../../components/layout/tooltip';
import { TEXTO_TOOLTIP_SESSOES_ATIVAS } from './dashboard';

// Aba "Saúde" (09-08-2026, Bloco H do prompt do Claude Web) — recebe o
// mesmo estado que a faixa de saúde da Visão Geral já calcula (não refaz a
// requisição). Claude Web sugeriu mostrar "última migration aplicada"
// lendo uma tabela `schema_migrations` — CONFERIDO contra o banco real
// antes de implementar: essa tabela NÃO EXISTE neste projeto (o histórico
// de mudança de schema vive nos arquivos numerados 01-08 + `ATUALIZAR O
// SUPABASE.sql`, não numa tabela de controle de migration formal) — por
// isso esse item não está aqui. Mostrar um dado fabricado seria pior que
// não mostrar nada.
export function DashboardSaude({ bancoConectado, resumo }) {
  return (
    <div className="space-y-4">
      <div className="fundo-cartao border borda-forte rounded-xl shadow-sm p-5">
        <h3 className="subtitulo mb-3">Conexão com o banco</h3>
        <div className="flex items-center gap-2 text-sm">
          <span
            className={
              'inline-block w-2.5 h-2.5 rounded-full ' +
              (bancoConectado === null
                ? 'bg-slate-300'
                : bancoConectado
                  ? 'bg-emerald-500'
                  : 'bg-red-500')
            }
          ></span>
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
