import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Tooltip } from '../../components/layout/tooltip';
import { BarraAbasBotoes } from '../../components/layout/barra-abas-botoes';
import { Carregando } from '../../components/layout/carregando';
import { dashboardApi } from '../../services/29-dashboard/api/dashboard.api';
import type { DashboardResponseSummary } from '../../services/29-dashboard/type/dashboard.type';
import { ROTULO_STATUS_CAMPANHA, type StatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarMoeda, formatarNumeroCompacto } from '../../services/constant/util/formatacao.util';
import { CartaoGrafico } from './dashboard-grafico';
import { DashboardRegrasNegocio } from './dashboard-regras-negocio';
import { DashboardSaude } from './dashboard-saude';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { useTarefasDesligadas } from '../../services/11-configuracoes/hook/use-tarefas-desligadas';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

// Texto do tooltip de "online". `contar_metricas_dashboard()` conta PESSOAS distintas com sessão não revogada
// criada (login ou renovação do token) dentro de configuracoes.dashboard_sessao_ativa_minutos.
const TEXTO_TOOLTIP_SESSOES_ATIVAS =
  'Pessoas com login ou renovação recente (a janela de tempo fica em Parâmetros do Sistema). Quem está em vários aparelhos conta uma vez só.';

// Abas. A aba "Identidade Visual" saiu em 16-11-2026 (Lucas): era só um espaço reservado, e não havia tempo de fazer e
// testar a troca de logo e cores pelo painel.
type AbaChave = 'visao-geral' | 'regras' | 'saude';

const ABAS: { chave: AbaChave; rotulo: string; icone: string }[] = [
  { chave: 'visao-geral', rotulo: 'Visão Geral', icone: 'fa-gauge' },
  { chave: 'regras', rotulo: 'Regras do Negócio', icone: 'fa-sliders' },
  { chave: 'saude', rotulo: 'Saúde', icone: 'fa-heart-pulse' },
];

// Bolinha de status de conexão: a Visão Geral e a aba Saúde (`dashboard-saude.tsx`) mostram a MESMA bolinha, com a
// MESMA lógica de 3 estados: exportado daqui e importado lá. Cor de `.ponto-status--*` (1-cores.css).
export function PontoStatusConexao({ valor }: { valor: boolean | null }) {
  return (
    <span
      className={
        'inline-block w-2.5 h-2.5 rounded-full shrink-0 ' +
        (valor === null ? 'ponto-status--neutro' : valor ? 'ponto-status--sucesso' : 'ponto-status--erro')
      }
    ></span>
  );
}

// Lista de campanhas já filtrada pelo status (o filtro mora no endereço, com o rótulo do status).
const campanhasCom = (status: StatusCampanha) =>
  `/admin/campanhas?status=${encodeURIComponent(ROTULO_STATUS_CAMPANHA[status])}`;

// =====================================================================================================================
// Visão Geral (redesenho de 16-11-2026). Referências: a tela inicial da Stripe (o gráfico do período com a comparação),
// os guias de painel admin de 2026 e a NN/g (dashboard é para entender rápido). Quatro áreas, em "pirâmide invertida":
//   1. a faixa dos 4 números principais, num cartão só;
//   2. o gráfico ao longo do tempo (arrecadação, apoios ou cadastros; 30 dias ou 12 meses) ao lado do que PRECISA DE
//      UMA PESSOA (cada linha leva à tela que resolve; some o que está zerado);
//   3. as campanhas por situação em barras (comprimento compara mais rápido que algarismos) ao lado da saúde do sistema.
// "Acessados recentemente" saiu: o menu lateral já leva a todas as telas.
// =====================================================================================================================

function CelulaNumero({
  icone,
  rotulo,
  valor,
  detalhe,
  para,
  dica,
  alerta = false,
  moeda = false,
}: {
  icone: string;
  rotulo: string;
  valor: string;
  detalhe: ReactNode;
  para?: string;
  dica?: string;
  alerta?: boolean;
  // Dinheiro: o tamanho acompanha a largura da célula (numero-metrica--moeda), para "R$ 78,5 mil" caber no celular.
  moeda?: boolean;
}) {
  const conteudo = (
    <>
      <div className="flex items-center gap-2 legenda texto-fraco mb-1">
        <i className={`fa-solid ${icone}`} aria-hidden="true" />
        {rotulo}
        {dica && <Tooltip texto={dica} />}
      </div>
      <div className={'numero-metrica ' + (moeda ? 'numero-metrica--moeda whitespace-nowrap ' : '') + (alerta ? 'texto-erro' : 'texto-forte')}>{valor}</div>
      <div className="legenda texto-fraco mt-1">{detalhe}</div>
    </>
  );
  const classe = '@container block p-4 sm:p-5 min-w-0 overflow-hidden';
  return para ? (
    <Link to={para} className={classe + ' hover-fundo-sutil transition-colors'}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

interface ItemAtencao {
  chave: string;
  quantidade: number;
  texto: string;
  detalhe?: string;
  icone: string;
  para: string;
}

// O que espera uma pessoa. Só entra o que não está zerado; cada item leva à tela que resolve.
function itensDeAtencao(resumo: DashboardResponseSummary, tarefasDesligadas: string[]): ItemAtencao[] {
  const itens: ItemAtencao[] = [
    {
      chave: 'aprovacao',
      quantidade: resumo.campanhasAguardandoAprovacao,
      texto: 'Campanhas aguardando aprovação',
      icone: 'fa-clipboard-check',
      para: '/admin/aprovar-campanhas',
    },
    { chave: 'denuncias', quantidade: resumo.denunciasPendentes, texto: 'Denúncias pendentes', icone: 'fa-flag', para: '/admin/denuncias' },
    {
      chave: 'encerramentos',
      quantidade: resumo.encerramentosPendentes,
      texto: 'Pedidos de encerramento',
      icone: 'fa-flag-checkered',
      para: '/admin/pedidos-encerramento',
    },
    {
      chave: 'eventos',
      quantidade: resumo.eventosPagamentoEmRevisao,
      texto: 'Eventos de pagamento em revisão',
      icone: 'fa-file-invoice-dollar',
      para: '/admin/eventos-pagamento',
    },
    { chave: 'emails', quantidade: resumo.notificacoesComFalha, texto: 'E-mails com falha', icone: 'fa-envelope', para: '/admin/notificacoes' },
    {
      chave: 'tarefas',
      quantidade: tarefasDesligadas.length,
      texto: 'Tarefas automáticas desligadas',
      detalhe: tarefasDesligadas.join(', '),
      icone: 'fa-pause',
      para: '/admin/parametros-sistema',
    },
  ];
  return itens.filter((item) => item.quantidade > 0);
}

function PrecisaDeAtencao({ itens }: { itens: ItemAtencao[] }) {
  const total = itens.reduce((soma, item) => soma + item.quantidade, 0);
  return (
    <section className="cartao-painel p-5 h-full" aria-labelledby="dashboard-atencao">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 id="dashboard-atencao" className="subtitulo">
          Precisa da sua atenção
        </h2>
        {total > 0 && <span className="badge badge-erro whitespace-nowrap">{total} {total === 1 ? 'pendência' : 'pendências'}</span>}
      </div>
      {itens.length === 0 ? (
        <p className="paragrafo texto-sucesso flex items-center gap-2 py-3">
          <i className="fa-solid fa-circle-check" aria-hidden="true" /> Tudo em dia: nada esperando por alguém agora.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--cor-borda)] -mx-2">
          {itens.map((item) => (
            <li key={item.chave}>
              <Link to={item.para} className="flex items-center gap-3 px-2 py-3 rounded-lg hover-fundo-sutil transition-colors">
                {/* Vermelho: é o que pede ação, a mesma cor do selo "N pendências" (o nome ao lado diz o quê). */}
                <i className={`fa-solid ${item.icone} w-5 text-center texto-erro`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block paragrafo enfase texto-padrao">{item.texto}</span>
                  {item.detalhe && <span className="block legenda texto-fraco">{item.detalhe}</span>}
                </span>
                <span className="numero enfase texto-forte">{item.quantidade}</span>
                <i className="fa-solid fa-chevron-right legenda texto-fraco" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Campanhas por situação: uma lista simples (16-11-2026, Lucas: o gráfico de barras confundia mais do que ajudava), no
// mesmo desenho da lista de atenção: ícone, a situação, o número e a setinha; cada linha abre a lista filtrada.
// "Outras situações" (rascunho, encerradas, em ajuste) fecha a conta.
function CampanhasPorSituacao({ resumo }: { resumo: DashboardResponseSummary }) {
  const linhas: { rotulo: string; valor: number; para: string; icone: string }[] = [
    { rotulo: 'Campanhas ativas', valor: resumo.campanhasAtivas, para: campanhasCom('ativo'), icone: 'fa-bullhorn' },
    { rotulo: 'Em aprovação', valor: resumo.campanhasAguardandoAprovacao, para: '/admin/aprovar-campanhas', icone: 'fa-hourglass-half' },
    { rotulo: 'Meta atingida', valor: resumo.campanhasSucesso, para: campanhasCom('sucesso'), icone: 'fa-trophy' },
    { rotulo: 'Meta não atingida', valor: resumo.campanhasNaoAtingida, para: campanhasCom('nao_atingido'), icone: 'fa-circle-xmark' },
  ];
  const outras = Math.max(0, resumo.totalCampanhas - linhas.reduce((soma, linha) => soma + linha.valor, 0));
  if (outras > 0) linhas.push({ rotulo: 'Outras situações', valor: outras, para: '/admin/campanhas', icone: 'fa-folder' });

  return (
    <section className="cartao-painel p-5 h-full" aria-labelledby="dashboard-campanhas">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="dashboard-campanhas" className="subtitulo">
          Campanhas por situação
        </h2>
        <Link to="/admin/campanhas" className="link-texto legenda">
          Ver as {resumo.totalCampanhas}
        </Link>
      </div>
      <ul className="divide-y divide-[var(--cor-borda)] -mx-2">
        {linhas.map((linha) => (
          <li key={linha.rotulo}>
            <Link to={linha.para} className="flex items-center gap-3 px-2 py-3 rounded-lg hover-fundo-sutil transition-colors">
              <i className={`fa-solid ${linha.icone} w-5 text-center texto-fraco`} aria-hidden="true" />
              <span className="paragrafo texto-padrao flex-1">{linha.rotulo}</span>
              <span className="numero enfase texto-forte">{linha.valor}</span>
              <i className="fa-solid fa-chevron-right legenda texto-fraco" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// A saúde do sistema, resumida: banco (GET /health), provedor de pagamento e de e-mail (GET /dashboard/saude, conferidos
// na hora). O detalhe fica na aba Saúde.
function SaudeResumida({
  auth,
  bancoConectado,
  resumo,
  aoVerDetalhes,
}: {
  auth: UseAuthReturn;
  bancoConectado: boolean | null;
  resumo: DashboardResponseSummary;
  aoVerDetalhes: () => void;
}) {
  const { dado: saude, carregando } = useBuscar(() => dashboardApi.verificarServicos(auth.authFetch), []);
  const situacao = (ok: boolean | null) => (ok === null ? 'Verificando…' : ok ? 'Conectado' : 'Sem conexão');
  const linhas: { icone: string; rotulo: string; ok: boolean | null; detalhe?: string }[] = [
    { icone: 'fa-database', rotulo: 'Banco de dados', ok: bancoConectado },
    {
      icone: 'fa-credit-card',
      rotulo: 'Pagamentos',
      ok: carregando || !saude ? null : saude.pagamento.ok,
      detalhe: saude?.pagamento.saldo != null ? `saldo ${formatarMoeda(saude.pagamento.saldo)}` : undefined,
    },
    {
      icone: 'fa-envelope',
      rotulo: 'E-mail',
      ok: carregando || !saude ? null : saude.email.ok,
      detalhe: `${resumo.notificacoesPendentes} na fila`,
    },
  ];
  return (
    <section className="cartao-painel p-5 h-full" aria-labelledby="dashboard-saude-resumo">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="dashboard-saude-resumo" className="subtitulo">
          Saúde do sistema
        </h2>
        <button type="button" className="link-texto legenda" onClick={aoVerDetalhes}>
          Ver detalhes
        </button>
      </div>
      <ul className="divide-y divide-[var(--cor-borda)]">
        {linhas.map((linha) => (
          <li key={linha.rotulo} className="flex items-center gap-3 py-2.5 first:pt-0">
            <i className={`fa-solid ${linha.icone} w-5 text-center texto-fraco`} aria-hidden="true" />
            <span className="paragrafo texto-padrao flex-1">{linha.rotulo}</span>
            {linha.detalhe && <span className="legenda texto-fraco hidden sm:inline">{linha.detalhe}</span>}
            <span className="flex items-center gap-1.5 legenda enfase">
              <PontoStatusConexao valor={linha.ok} />
              <span className={linha.ok === false ? 'texto-erro' : 'texto-padrao'}>{situacao(linha.ok)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface DashboardProps {
  auth: UseAuthReturn;
}

// Tela inicial do painel admin (/admin/dashboard). O resumo (GET /dashboard/resumo) e a conexão do banco (GET /health)
// vêm de requisições INDEPENDENTES: se o resumo falhar (banco fora do ar), o erro aparece sem esconder o resto.
export function Dashboard({ auth }: DashboardProps) {
  const {
    dado: resumo,
    carregando: carregandoResumo,
    erro,
  } = useBuscar(() => dashboardApi.buscarResumo(auth.authFetch), [], { mostraTexto: true });
  const [bancoConectado, setBancoConectado] = useState<boolean | null>(null); // null = ainda verificando
  const [abaAtiva, setAbaAtiva] = useState<AbaChave>('visao-geral');
  const tarefasDesligadas = useTarefasDesligadas(auth.authFetch);

  useEffect(() => {
    dashboardApi
      .verificarSaude(auth.authFetch)
      .then(() => setBancoConectado(true))
      .catch(() => setBancoConectado(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itens = resumo ? itensDeAtencao(resumo, tarefasDesligadas.map((tarefa) => tarefa.rotulo)) : [];
  const pendencias = itens.reduce((soma, item) => soma + item.quantidade, 0);

  return (
    // pt-6: o título do Dashboard fica fora de qualquer painel e quase encostaria no cabeçalho do site.
    <div className="space-y-6 pt-6">
      <h1 className="titulo-pagina">Dashboard</h1>

      <BarraAbasBotoes abas={ABAS} ativa={abaAtiva} aoTrocar={setAbaAtiva} />

      {abaAtiva === 'visao-geral' &&
        (carregandoResumo ? (
          <Carregando />
        ) : !resumo ? (
          <MensagemErro texto={erro} className="crud-erro" />
        ) : (
          <div className="space-y-6">
            {/* 1. Os 4 números principais, numa faixa só */}
            <div className="cartao-painel overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[var(--cor-borda)]">
              <CelulaNumero
                icone="fa-sack-dollar"
                rotulo="Arrecadado"
                valor={`R$ ${formatarNumeroCompacto(resumo.valorTotalArrecadado)}`}
                detalhe={formatarMoeda(resumo.valorTotalArrecadado)}
                moeda
              />
              <CelulaNumero
                icone="fa-bullhorn"
                rotulo="Campanhas ativas"
                valor={String(resumo.campanhasAtivas)}
                detalhe={`de ${resumo.totalCampanhas} campanhas`}
                para={campanhasCom('ativo')}
              />
              <CelulaNumero
                icone="fa-users"
                rotulo="Usuários"
                valor={String(resumo.totalUsuarios)}
                detalhe={
                  // "online" em verde, com a bolinha (o sinal de "conectado" das redes e dos chats).
                  <>
                    {resumo.totalPesquisadores} pesquisadores ·{' '}
                    <span className="texto-sucesso enfase inline-flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full ponto-status--sucesso" aria-hidden="true" />
                      {resumo.sessoesAtivas} online
                    </span>
                  </>
                }
                dica={TEXTO_TOOLTIP_SESSOES_ATIVAS}
                para="/admin/usuarios"
              />
              <CelulaNumero
                icone="fa-clipboard-list"
                rotulo="Pendências"
                valor={String(pendencias)}
                detalhe={pendencias > 0 ? 'ações necessárias' : 'tudo em dia'}
                alerta={pendencias > 0}
              />
            </div>

            {/* 2. O gráfico ao lado do que precisa de alguém */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-3 min-w-0">
                <CartaoGrafico authFetch={auth.authFetch} />
              </div>
              <div className="xl:col-span-2">
                <PrecisaDeAtencao itens={itens} />
              </div>
            </div>

            {/* 3. As campanhas por situação ao lado da saúde do sistema */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <div className="xl:col-span-3">
                <CampanhasPorSituacao resumo={resumo} />
              </div>
              <div className="xl:col-span-2">
                <SaudeResumida auth={auth} bancoConectado={bancoConectado} resumo={resumo} aoVerDetalhes={() => setAbaAtiva('saude')} />
              </div>
            </div>
          </div>
        ))}

      {abaAtiva === 'regras' && <DashboardRegrasNegocio auth={auth} />}
      {abaAtiva === 'saude' && <DashboardSaude auth={auth} bancoConectado={bancoConectado} resumo={resumo} />}
    </div>
  );
}
