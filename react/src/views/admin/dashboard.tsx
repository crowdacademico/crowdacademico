import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Tooltip } from '../../components/layout/tooltip';
import { dashboardApi } from '../../services/admin/api/dashboard.api';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarReaisSemSimbolo } from '../../services/constant/utils/formatacao.util';
import { DashboardIdentidadeVisual } from './dashboard-identidade-visual';
import { DashboardRegrasNegocio } from './dashboard-regras-negocio';
import { DashboardSaude } from './dashboard-saude';
import { lerAcessadosRecentemente } from '../../services/router/acessados-recentemente';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

// Texto do tooltip de "sessões abertas": exportado porque a aba Saúde (dashboard-saude.tsx) mostra a MESMA
// métrica e precisa do MESMO texto. `contar_metricas_dashboard()` conta sessão não revogada dentro da validade
// de 30 dias (REFRESH_TOKEN_DIAS_VALIDADE), não gente online agora: por isso o rótulo diz "(30 dias)".
export const TEXTO_TOOLTIP_SESSOES_ABERTAS =
  'Contagem de sessões não-revogadas em 30 dias, não gente online.';

// Abas: estrutura em abas em vez de empilhar seção atrás de seção (para o Dashboard não virar uma "tela onde
// tudo cabe"). "Visão Geral" tem os cards + prévia de notificações; as outras 3 (Regras do Negócio, Identidade
// Visual, Saúde) são visões do painel global.
type AbaChave = 'visao-geral' | 'regras' | 'identidade' | 'saude';

const ABAS: { chave: AbaChave; rotulo: string; icone: string }[] = [
  { chave: 'visao-geral', rotulo: 'Visão Geral', icone: 'fa-gauge' },
  { chave: 'regras', rotulo: 'Regras do Negócio', icone: 'fa-sliders' },
  { chave: 'identidade', rotulo: 'Identidade Visual', icone: 'fa-image' },
  { chave: 'saude', rotulo: 'Saúde', icone: 'fa-heart-pulse' },
];

// Card de total: só rótulo pequeno em cinza maiúsculo + número grande, sem ícone/fundo colorido: é assim que o
// Experiment.com mostra número, cor vira acento raro, não preenchimento. `valor === null` = módulo ainda não
// existe (hoje só notificação): mostra "-" em vez de esconder o card ou fingir que é 0. Borda slate-300, o
// mesmo tom das bordas de tabela. `moeda`: o "R$" sai menor, na frente, e o número nunca quebra no meio
// ("R$ 257.800,00" inteiro no tamanho grande não cabia no card e quebrava o último zero para a linha de baixo).
interface CardMetricaProps {
  rotulo: string;
  valor: number | string | null;
  moeda?: boolean;
}

function CardMetrica({ rotulo, valor, moeda = false }: CardMetricaProps) {
  return (
    <div className="@container cartao-painel p-5 min-w-0 break-words">
      <div className="rotulo-leitura mb-1">
        {rotulo}
      </div>
      <div
        className={
          // Moeda: acompanha a largura do card (`cqi`), entre text-base e text-3xl, com a mesma altura de
          // linha do text-3xl, para caber no celular sem desalinhar dos cards vizinhos.
          (moeda ? 'text-[clamp(1rem,13.5cqi,1.875rem)] leading-9 ' : 'text-3xl ') +
          'font-extrabold whitespace-nowrap ' +
          (valor === null ? 'texto-fraco opacity-50' : 'texto-forte')
        }
      >
        {valor === null ? (
          '-'
        ) : moeda ? (
          <>
            <span className="text-lg mr-1">R$</span>
            {formatarReaisSemSimbolo(valor)}
          </>
        ) : (
          valor
        )}
      </div>
    </div>
  );
}

// Bolinha de status de conexão: a Visão Geral (abaixo) e a aba Saúde (`dashboard-saude.tsx`) mostram a MESMA
// bolinha, com a MESMA lógica de 3 estados: exportado daqui e importado lá, mesmo padrão de
// `TEXTO_TOOLTIP_SESSOES_ABERTAS` acima. Cor vem de `.ponto-status--*` (1-cores.css), reaproveitando os mesmos
// tokens de status dos badges (se adapta ao tema escuro).
export function PontoStatusConexao({ valor }: { valor: boolean | null }) {
  return (
    <span
      className={
        'inline-block w-2.5 h-2.5 rounded-full ' +
        (valor === null ? 'ponto-status--neutro' : valor ? 'ponto-status--sucesso' : 'ponto-status--erro')
      }
    ></span>
  );
}

// Tela inicial do painel admin (/admin/dashboard): uma visão geral antes de cair direto em "Usuários".
//
// A faixa de saúde e os cards de total vêm de DUAS requisições INDEPENDENTES (não um Promise.all combinado): se
// GET /dashboard/resumo falhasse (ex.: banco fora do ar), a tela inteira ficaria em branco, exatamente no
// momento em que ela mais precisa mostrar "banco sem conexão". Cada uma tem seu próprio estado de
// carregando/erro, e a faixa de saúde sempre aparece.
interface DashboardProps {
  auth: UseAuthReturn;
}

export function Dashboard({ auth }: DashboardProps) {
  const {
    dado: resumo,
    carregando: carregandoResumo,
    erro,
  } = useBuscar(() => dashboardApi.buscarResumo(auth.authFetch), []);
  const [bancoConectado, setBancoConectado] = useState<boolean | null>(null); // null = ainda verificando
  const [abaAtiva, setAbaAtiva] = useState<AbaChave>('visao-geral');
  // Lido uma vez ao abrir: o Dashboard é a página de partida, a lista não muda enquanto ela está na tela.
  const [acessados] = useState(() => (auth.usuario ? lerAcessadosRecentemente(auth.usuario.idUsuario) : []));

  useEffect(() => {
    dashboardApi
      .verificarSaude(auth.authFetch)
      .then(() => setBancoConectado(true))
      .catch(() => setBancoConectado(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // pt-6 + letreiro maior: o título do Dashboard fica FORA de qualquer painel, só com o padding do
    // .admin-content-area (1.5rem), então quase encostaria no cabeçalho do site; as outras abas
    // (Usuários/Papéis/Configurações) não sentem esse aperto porque o conteúdo delas já nasce dentro de
    // .admin-content-painel (padding de 2rem). Por isso ganha um respiro extra só aqui.
    <div className="space-y-6 pt-6">
      <h1 className="text-3xl font-serif font-bold texto-forte">Dashboard</h1>

      <div className="barra-abas gap-1">
        {ABAS.map((aba) => (
          <button
            key={aba.chave}
            type="button"
            onClick={() => setAbaAtiva(aba.chave)}
            className={
              'px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ' +
              (abaAtiva === aba.chave
                ? 'borda-marca texto-marca'
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
          {/* (b) Faixa de saúde - sempre renderiza, mesmo se o resumo abaixo
              falhar (é precisamente aí que ela mais importa). */}
          <div className="cartao-painel p-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            <span className="flex items-center gap-2 font-semibold texto-padrao">
              <PontoStatusConexao valor={bancoConectado} />
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
              sessões abertas (30 dias)
              <Tooltip texto={TEXTO_TOOLTIP_SESSOES_ABERTAS} />
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
            <p className="crud-erro">{erro}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CardMetrica rotulo="Usuários" valor={resumo.totalUsuarios} />
                <CardMetrica rotulo="Pesquisadores" valor={resumo.totalPesquisadores} />
                <CardMetrica rotulo="Papéis" valor={resumo.totalPapeis} />
                <CardMetrica rotulo="Permissões" valor={resumo.totalPermissoes} />
                <CardMetrica rotulo="Configurações" valor={resumo.totalConfiguracoes} />
                <CardMetrica rotulo="Campanhas" valor={resumo.totalCampanhas} />
                <CardMetrica rotulo="Denúncias pendentes" valor={resumo.denunciasPendentes} />
                <CardMetrica rotulo="Arrecadado (total)" valor={resumo.valorTotalArrecadado} moeda />
              </div>

              {/* Campanhas por status (RF-084): o requisito pede essa quebra, não só o total. "Fila com
                  score baixo" é a 5ª parte do RF-084: campanha aguardando aprovação cujo pesquisador está
                  abaixo do score mínimo, só um sinal para revisar com mais cuidado. */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <CardMetrica rotulo="Campanhas ativas" valor={resumo.campanhasAtivas} />
                <CardMetrica rotulo="Campanhas com sucesso" valor={resumo.campanhasSucesso} />
                <CardMetrica rotulo="Campanhas não atingidas" valor={resumo.campanhasNaoAtingida} />
                <CardMetrica rotulo="Aguardando aprovação" valor={resumo.campanhasAguardandoAprovacao} />
                <CardMetrica rotulo="Fila com score baixo" valor={resumo.campanhasParaRevisaoScore} />
              </div>
            </>
          )}

          {acessados.length > 0 && (
            <div className="cartao-painel p-5">
              <h2 className="subtitulo mb-3">Acessados recentemente</h2>
              <div className="flex flex-wrap gap-2">
                {acessados.map((rota) => (
                  <Link key={rota.caminho} to={rota.caminho} className="btn btn-secondary text-sm flex items-center gap-2">
                    {rota.icone && <i className={'fa-solid ' + rota.icone} aria-hidden="true"></i>}
                    {rota.rotuloMenu}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* (c) Prévia: NOTIFICAÇÕES, não log de auditoria (log de auditoria já tem painel próprio, "Ver
              log", embaixo de cada tabela). Módulo 26-notificacao ainda não existe (nem tabela mapeada no
              Kysely, nem controller): mostra isso honestamente em vez de inventar dado. */}
          <div className="cartao-painel p-5">
            <h2 className="subtitulo mb-2">Notificações</h2>
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
