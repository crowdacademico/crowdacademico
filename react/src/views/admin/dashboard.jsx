import { useEffect, useState } from 'react';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { dashboardApi } from '../../services/admin/api/dashboard.api';

// Card de total (item "a" do pedido do Lucas, 08-08-2026): só rótulo
// pequeno em cinza maiúsculo + número grande, sem ícone/fundo colorido —
// é assim que o Experiment.com mostra número, cor vira acento raro, não
// preenchimento. `valor === null` = módulo ainda não existe (campanha,
// notificação) — mostra "—" em vez de esconder o card ou fingir que é 0.
// Borda ERA slate-200 (pedido original) — escurecida pro slate-300 a
// pedido do Lucas (09-08-2026), mesmo tom já usado nas bordas de tabela.
function CardMetrica({ rotulo, valor }) {
  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
        {rotulo}
      </div>
      <div
        className={
          'text-3xl font-extrabold ' + (valor === null ? 'text-slate-300' : 'text-dark')
        }
      >
        {valor === null ? '—' : valor}
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
      <h2 className="text-3xl font-serif font-bold text-dark">Dashboard</h2>

      {/* (b) Faixa de saúde — sempre renderiza, mesmo se o resumo abaixo
          falhar (é precisamente aí que ela mais importa). */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
        <span className="flex items-center gap-2 font-semibold text-slate-700">
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
        <span className="text-slate-600">
          <strong className="text-slate-800">
            {resumo ? resumo.sessoesAtivas : '—'}
          </strong>{' '}
          sessões ativas agora
        </span>
        <span className="text-slate-600">
          <strong className="text-slate-800">
            {resumo?.notificacoesPendentes === null || resumo === null
              ? '—'
              : resumo.notificacoesPendentes}
          </strong>{' '}
          notificações pendentes
        </span>
      </div>

      {/* (a) Cards de total */}
      {carregandoResumo ? (
        <p className="text-sm text-slate-600">Carregando métricas...</p>
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
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-2">Notificações</h3>
        <p className="text-sm text-slate-500">
          Módulo de notificações ainda não foi implementado — esta prévia vai listar as
          pendências assim que existir.
        </p>
      </div>
    </div>
  );
}
