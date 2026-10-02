import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Tooltip } from '../../components/layout/tooltip';
import { BarraAbasBotoes } from '../../components/layout/barra-abas-botoes';
import { dashboardApi } from '../../services/28-dashboard/api/dashboard.api';
import { ROTULO_STATUS_CAMPANHA, type StatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarReaisSemSimbolo } from '../../services/constant/util/formatacao.util';
import { DashboardIdentidadeVisual } from './dashboard-identidade-visual';
import { DashboardRegrasNegocio } from './dashboard-regras-negocio';
import { DashboardSaude } from './dashboard-saude';
import { lerAcessadosRecentemente } from '../../services/router/acessados-recentemente';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

// Texto do tooltip de "contas ativas": exportado porque a aba Saúde (dashboard-saude.tsx) mostra a MESMA
// métrica e precisa do MESMO texto. `contar_metricas_dashboard()` conta PESSOAS distintas com sessão não revogada
// criada (login ou renovação do token) dentro de configuracoes.dashboard_sessao_ativa_minutos. O campo da API
// continua `sessoesAtivas`.
export const TEXTO_TOOLTIP_SESSOES_ATIVAS =
  'Pessoas com login ou renovação recente (janela ajustável nas configurações, padrão 30 minutos). Quem está em vários aparelhos conta uma vez só: uma aproximação de quem está usando o sistema agora.';

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
  // Lista que o número resume (já filtrada, quando dá): clicar no card leva direto a ela.
  para?: string;
}

function CardMetrica({ rotulo, valor, moeda = false, para }: CardMetricaProps) {
  const conteudo = (
    <>
      <div className="rotulo-leitura mb-1">
        {rotulo}
      </div>
      <div
        className={
          // Moeda: acompanha a largura do card (`cqi`), entre text-base e text-3xl, com a mesma altura de
          // linha do text-3xl, para caber no celular sem desalinhar dos cards vizinhos.
          (moeda ? 'numero-metrica numero-metrica--moeda ' : 'numero-metrica ') +
          '' +
          (valor === null ? 'texto-fraco opacity-50' : 'texto-forte')
        }
      >
        {valor === null ? (
          '-'
        ) : moeda ? (
          <>
            <span className="numero-metrica__simbolo">R$</span>
            {formatarReaisSemSimbolo(valor)}
          </>
        ) : (
          valor
        )}
      </div>
    </>
  );
  const classe = '@container cartao-painel p-5 min-w-0 break-words';
  return para ? (
    <Link to={para} className={classe + ' block hover-fundo-sutil transition-colors'} aria-label={`${rotulo}: ver a lista`}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

// Lista de campanhas já filtrada pelo status (o filtro mora no endereço, com o rótulo do status).
const campanhasCom = (status: StatusCampanha) =>
  `/admin/campanhas?status=${encodeURIComponent(ROTULO_STATUS_CAMPANHA[status])}`;

// Bolinha de status de conexão: a Visão Geral (abaixo) e a aba Saúde (`dashboard-saude.tsx`) mostram a MESMA
// bolinha, com a MESMA lógica de 3 estados: exportado daqui e importado lá, mesmo padrão de
// `TEXTO_TOOLTIP_SESSOES_ATIVAS` acima. Cor vem de `.ponto-status--*` (1-cores.css), reaproveitando os mesmos
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
  } = useBuscar(() => dashboardApi.buscarResumo(auth.authFetch), [], { mostraTexto: true });
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
      <h1 className="titulo-pagina">Dashboard</h1>

      <BarraAbasBotoes abas={ABAS} ativa={abaAtiva} aoTrocar={setAbaAtiva} />

      {abaAtiva === 'visao-geral' && (
        <div className="space-y-6">
          {/* (b) Faixa de saúde - sempre renderiza, mesmo se o resumo abaixo
              falhar (é precisamente aí que ela mais importa). */}
          <div className="paragrafo cartao-painel p-5 flex flex-wrap items-center gap-x-8 gap-y-3 texto-herdado">
            <span className="flex items-center gap-2 enfase texto-padrao">
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
              contas ativas agora
              <Tooltip texto={TEXTO_TOOLTIP_SESSOES_ATIVAS} />
            </span>
            <span className="texto-fraco">
              {/* Sem o módulo de notificações o número não existe: "em breve", não um traço solto. */}
              {resumo?.notificacoesPendentes === null || resumo === null ? (
                'Notificações: em breve'
              ) : (
                <>
                  <strong className="texto-forte">{resumo.notificacoesPendentes}</strong> notificações pendentes
                </>
              )}
            </span>
          </div>

          {/* (a) Cards de total */}
          {carregandoResumo ? (
            <p className="paragrafo texto-fraco">Carregando métricas...</p>
          ) : !resumo ? (
            <MensagemErro texto={erro} className="crud-erro" />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CardMetrica rotulo="Usuários" valor={resumo.totalUsuarios} para="/admin/usuarios" />
                <CardMetrica rotulo="Pesquisadores" valor={resumo.totalPesquisadores} para="/admin/pesquisadores" />
                <CardMetrica rotulo="Papéis" valor={resumo.totalPapeis} para="/admin/papeis" />
                <CardMetrica rotulo="Permissões" valor={resumo.totalPermissoes} para="/admin/papeis" />
                <CardMetrica rotulo="Configurações" valor={resumo.totalConfiguracoes} para="/admin/configuracoes" />
                <CardMetrica rotulo="Campanhas" valor={resumo.totalCampanhas} para="/admin/campanhas" />
                <CardMetrica rotulo="Denúncias pendentes" valor={resumo.denunciasPendentes} />
                <CardMetrica rotulo="Arrecadado (total)" valor={resumo.valorTotalArrecadado} moeda />
              </div>

              {/* Campanhas por status (RF-084): o requisito pede essa quebra, não só o total. "Fila com
                  score baixo" é a 5ª parte do RF-084: campanha aguardando aprovação cujo pesquisador está
                  abaixo do score mínimo, só um sinal para revisar com mais cuidado. */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <CardMetrica rotulo="Campanhas ativas" valor={resumo.campanhasAtivas} para={campanhasCom('ativo')} />
                <CardMetrica rotulo="Campanhas com sucesso" valor={resumo.campanhasSucesso} para={campanhasCom('sucesso')} />
                <CardMetrica
                  rotulo="Campanhas não atingidas"
                  valor={resumo.campanhasNaoAtingida}
                  para={campanhasCom('nao_atingido')}
                />
                <CardMetrica
                  rotulo="Aguardando aprovação"
                  valor={resumo.campanhasAguardandoAprovacao}
                  para="/admin/aprovar-campanhas"
                />
                <CardMetrica
                  rotulo="Fila com score baixo"
                  valor={resumo.campanhasParaRevisaoScore}
                  para="/admin/aprovar-campanhas"
                />
              </div>
            </>
          )}

          {acessados.length > 0 && (
            <div className="cartao-painel p-5">
              <h2 className="subtitulo mb-3">Acessados recentemente</h2>
              <div className="flex flex-wrap gap-2">
                {acessados.map((rota) => (
                  <Link key={rota.caminho} to={rota.caminho} className="btn btn-secondary flex items-center gap-2">
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
            <p className="paragrafo texto-fraco">
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
