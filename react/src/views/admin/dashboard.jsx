import { useEffect, useState } from 'react';
import { Tooltip } from '../../components/layout/tooltip';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { dashboardApi } from '../../services/admin/api/dashboard.api';
import { DashboardIdentidadeVisual } from './dashboard-identidade-visual';
import { DashboardRegrasNegocio } from './dashboard-regras-negocio';
import { DashboardSaude } from './dashboard-saude';

// Texto do tooltip de "sessões ativas" (10-08-2026, pedido do Lucas) —
// exportado porque a aba Saúde (dashboard-saude.jsx) mostra a MESMA
// métrica e precisa do MESMO texto, não uma 2ª cópia que poderia divergir.
// "Sessões ativas agora" sugere gente online neste instante, mas
// `contar_metricas_dashboard()` conta sessão não-revogada dentro da
// validade de 30 dias (REFRESH_TOKEN_DIAS_VALIDADE) — sobe rápido em
// ambiente de teste, sem ninguém "online" de verdade.
export const TEXTO_TOOLTIP_SESSOES_ATIVAS =
  'Contagem de sessões não-revogadas em 30 dias, não gente online.';

// Abas (09-08-2026, Bloco H do prompt do Claude Web: Dashboard como painel
// global) — cuidado explícito do Claude Web contra virar "tela onde tudo
// cabe": estrutura em abas em vez de empilhar seção atrás de seção. "Visão
// Geral" é o que já existia (cards + prévia de notificações); as outras 3
// são novas.
const ABAS = [
  { chave: 'visao-geral', rotulo: 'Visão Geral', icone: 'fa-gauge' },
  { chave: 'regras', rotulo: 'Regras do Negócio', icone: 'fa-sliders' },
  { chave: 'identidade', rotulo: 'Identidade Visual', icone: 'fa-image' },
  { chave: 'saude', rotulo: 'Saúde', icone: 'fa-heart-pulse' },
];

// Card de total (item "a" do pedido do Lucas, 08-08-2026): só rótulo
// pequeno em cinza maiúsculo + número grande, sem ícone/fundo colorido —
// é assim que o Experiment.com mostra número, cor vira acento raro, não
// preenchimento. `valor === null` = módulo ainda não existe (campanha,
// notificação) — mostra "—" em vez de esconder o card ou fingir que é 0.
// Borda ERA slate-200 (pedido original) — escurecida pro slate-300 a
// pedido do Lucas (09-08-2026), mesmo tom já usado nas bordas de tabela.
function CardMetrica({ rotulo, valor }) {
  return (
    <div className="fundo-cartao border borda-forte rounded-xl shadow-sm p-5">
      <div className="text-[11px] font-bold texto-fraco uppercase tracking-widest mb-1">
        {rotulo}
      </div>
      <div
        className={
          'text-3xl font-extrabold ' + (valor === null ? 'texto-fraco opacity-50' : 'texto-forte')
        }
      >
        {valor === null ? '-' : valor}
      </div>
    </div>
  );
}

// Tela inicial do painel admin (/admin/dashboard) — pedido do Lucas,
// 08-08-2026: uma visão geral antes de cair direto em "Usuários".
//
// A faixa de saúde e os cards de total vêm de DUAS requisições
// INDEPENDENTES (não um Promise.all combinado) — achado do Lucas testando:
// se GET /dashboard/resumo falhasse (ex.: banco fora do ar), a tela
// inteira ficava em branco, exatamente no momento em que ela mais
// precisava mostrar "banco sem conexão". Agora cada uma tem seu próprio
// estado de carregando/erro, e a faixa de saúde sempre aparece.
export function Dashboard({ auth }) {
  const [resumo, setResumo] = useState(null);
  const [carregandoResumo, setCarregandoResumo] = useState(true);
  const [bancoConectado, setBancoConectado] = useState(null); // null = ainda verificando
  const [abaAtiva, setAbaAtiva] = useState('visao-geral');
  const { erro, reportarErro } = useErroToast();

  useEffect(() => {
    dashboardApi
      .buscarResumo(auth.authFetch)
      .then(setResumo)
      .catch(reportarErro)
      .finally(() => setCarregandoResumo(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dashboardApi
      .verificarSaude(auth.authFetch)
      .then(() => setBancoConectado(true))
      .catch(() => setBancoConectado(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // pt-6 + letreiro maior (09-08-2026, pedido do Lucas: "está quase
    // encostando no cabeçalho do site... pode descer tudo"). As outras
    // abas (Usuários/Papéis/Configurações) não sentem esse aperto porque
    // o conteúdo delas já nasce dentro de .admin-content-painel (padding
    // de 2rem) — o título do Dashboard fica FORA de qualquer painel, só
    // com o padding do .admin-content-area (1.5rem), por isso ganha um
    // respiro extra só aqui.
    <div className="space-y-6 pt-6">
      <h2 className="text-3xl font-serif font-bold texto-forte">Dashboard</h2>

      <div className="flex gap-1 border-b borda-padrao overflow-x-auto">
        {ABAS.map((aba) => (
          <button
            key={aba.chave}
            type="button"
            onClick={() => setAbaAtiva(aba.chave)}
            className={
              'px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap transition-colors ' +
              (abaAtiva === aba.chave
                ? 'border-primary text-primary'
                : 'border-transparent texto-fraco hover-texto-forte')
            }
          >
            <i className={'fa-solid ' + aba.icone}></i>
            {aba.rotulo}
          </button>
        ))}
      </div>

      {abaAtiva === 'visao-geral' && (
        <div className="space-y-6">
          {/* (b) Faixa de saúde — sempre renderiza, mesmo se o resumo abaixo
              falhar (é precisamente aí que ela mais importa). */}
          <div className="fundo-cartao border borda-forte rounded-xl shadow-sm p-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <span className="flex items-center gap-2 font-semibold texto-padrao">
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
              {bancoConectado === null
                ? 'Verificando banco...'
                : bancoConectado
                  ? 'Banco conectado'
                  : 'Banco sem conexão'}
            </span>
            <span className="texto-fraco">
              <strong className="texto-forte">
                {resumo ? resumo.sessoesAtivas : '-'}
              </strong>{' '}
              sessões ativas agora
              <Tooltip texto={TEXTO_TOOLTIP_SESSOES_ATIVAS} />
            </span>
            <span className="texto-fraco">
              <strong className="texto-forte">
                {resumo?.notificacoesPendentes === null || resumo === null
                  ? '-'
                  : resumo.notificacoesPendentes}
              </strong>{' '}
              notificações pendentes
            </span>
          </div>

          {/* (a) Cards de total */}
          {carregandoResumo ? (
            <p className="text-sm texto-fraco">Carregando métricas...</p>
          ) : !resumo ? (
            <p className="crud-erro">{erro ?? 'Não foi possível carregar as métricas.'}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CardMetrica rotulo="Usuários" valor={resumo.totalUsuarios} />
              <CardMetrica rotulo="Pesquisadores" valor={resumo.totalPesquisadores} />
              <CardMetrica rotulo="Papéis" valor={resumo.totalPapeis} />
              <CardMetrica rotulo="Permissões" valor={resumo.totalPermissoes} />
              <CardMetrica rotulo="Configurações" valor={resumo.totalConfiguracoes} />
              <CardMetrica rotulo="Campanhas" valor={resumo.totalCampanhas} />
            </div>
          )}

          {/* (c) Prévia — NOTIFICAÇÕES, não log de auditoria (correção do
              Lucas, 08-08-2026: log de auditoria já tem painel próprio, "Ver
              log", embaixo de cada tabela). Módulo 26-notificacao ainda não
              existe (nem tabela mapeada no Kysely, nem controller) — mostra
              isso honestamente em vez de inventar dado. */}
          <div className="fundo-cartao border borda-forte rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-bold texto-padrao mb-2">Notificações</h3>
            <p className="text-sm texto-fraco">
              Módulo de notificações ainda não foi implementado, esta prévia vai listar as
              pendências assim que existir.
            </p>
          </div>
        </div>
      )}

      {abaAtiva === 'regras' && <DashboardRegrasNegocio auth={auth} />}
      {abaAtiva === 'identidade' && <DashboardIdentidadeVisual />}
      {abaAtiva === 'saude' && <DashboardSaude bancoConectado={bancoConectado} resumo={resumo} />}
    </div>
  );
}
