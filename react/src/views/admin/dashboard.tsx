import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Tooltip } from '../../components/layout/tooltip';
import { BarraAbasBotoes } from '../../components/layout/barra-abas-botoes';
import { dashboardApi } from '../../services/28-dashboard/api/dashboard.api';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ROTULO_STATUS_CAMPANHA, type StatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarDataHora, formatarReaisSemSimbolo } from '../../services/constant/util/formatacao.util';
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
// tudo cabe"). "Visão Geral" tem "Precisa de você", os totais, a atividade recente e os acessados recentemente;
// as outras 3 (Regras do Negócio, Identidade Visual, Saúde) são visões do painel global.
type AbaChave = 'visao-geral' | 'regras' | 'identidade' | 'saude';

const ABAS: { chave: AbaChave; rotulo: string; icone: string }[] = [
  { chave: 'visao-geral', rotulo: 'Visão Geral', icone: 'fa-gauge' },
  { chave: 'regras', rotulo: 'Regras do Negócio', icone: 'fa-sliders' },
  { chave: 'identidade', rotulo: 'Identidade Visual', icone: 'fa-image' },
  { chave: 'saude', rotulo: 'Saúde', icone: 'fa-heart-pulse' },
];

// Card de total: ícone num quadradinho de cor suave, rótulo pequeno em maiúsculas e número grande. `tom`:
// "aviso" pinta o card de amarelo claro (algo esperando alguém, ver "Precisa de você"); "ok" diz que está em dia.
// `valor === null` = módulo ainda não existe: mostra "-" em vez de fingir que é 0. `moeda`: o "R$" sai menor, na
// frente, e o número nunca quebra no meio. `para`: clicar leva à lista que o número resume (já filtrada).
interface CardMetricaProps {
  rotulo: string;
  valor: number | string | null;
  icone: string;
  moeda?: boolean;
  tom?: 'neutro' | 'aviso' | 'ok';
  para?: string;
}

function CardMetrica({ rotulo, valor, icone, moeda = false, tom = 'neutro', para }: CardMetricaProps) {
  const conteudo = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="rotulo-leitura mb-1">{rotulo}</div>
        <div
          className={
            // Moeda: acompanha a largura do card (`cqi`), entre text-base e text-3xl, para caber no celular.
            (moeda ? 'text-[clamp(1rem,11cqi,1.875rem)] leading-9 ' : 'text-3xl ') +
            'font-extrabold whitespace-nowrap ' +
            (valor === null ? 'texto-fraco opacity-50' : tom === 'aviso' ? 'texto-aviso' : 'texto-forte')
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
        {tom === 'ok' && <p className="text-xs texto-sucesso font-semibold mt-1">Tudo em dia</p>}
      </div>
      <span
        className={
          'w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ' +
          (tom === 'aviso'
            ? 'fundo-cartao texto-aviso'
            : tom === 'ok'
              ? 'fundo-sucesso texto-sucesso'
              : 'brilho-marca texto-marca')
        }
        aria-hidden="true"
      >
        <i className={'fa-solid ' + icone}></i>
      </span>
    </div>
  );
  const classe = '@container cartao-painel p-5 min-w-0 break-words' + (tom === 'aviso' ? ' cartao-painel--aviso' : '');
  return para ? (
    <Link
      to={para}
      className={classe + ' block hover:-translate-y-0.5 hover:shadow-md transition-all'}
      aria-label={`${rotulo}: ver a lista`}
    >
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

// "Precisa de você": com número, o card fica amarelo; zerado, "Tudo em dia".
const tomPendencia = (valor: number | null): 'aviso' | 'ok' | 'neutro' =>
  valor === null ? 'neutro' : valor > 0 ? 'aviso' : 'ok';

const OPERACAO: Record<string, { verbo: string; icone: string }> = {
  INSERT: { verbo: 'criou', icone: 'fa-plus' },
  UPDATE: { verbo: 'alterou', icone: 'fa-pen' },
  DELETE: { verbo: 'excluiu', icone: 'fa-trash' },
};

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
  // Atividade recente: o banco hoje só entrega a da própria pessoa (a mesma do sino do cabeçalho). Leitura
  // auxiliar: se falhar, o bloco só mostra que não há nada.
  const { dado: atividade } = useBuscar(() => logAuditoriaApi.minhaAtividade(auth.authFetch).catch(() => []), []);
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

      <BarraAbasBotoes abas={ABAS} ativa={abaAtiva} aoTrocar={setAbaAtiva} />

      {abaAtiva === 'visao-geral' && (
        <div className="space-y-8">
          {/* Faixa de saúde: sempre aparece, mesmo se o resumo abaixo falhar (é aí que ela mais importa). */}
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
              <strong className="texto-forte">{resumo ? resumo.sessoesAtivas : '-'}</strong> contas ativas agora
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

          {carregandoResumo ? (
            <p className="text-sm texto-fraco">Carregando métricas...</p>
          ) : !resumo ? (
            <MensagemErro texto={erro} className="crud-erro" />
          ) : (
            <>
              {/* O que espera uma decisão do painel vem primeiro. "Fila com score baixo" (RF-084): campanha
                  aguardando aprovação cujo pesquisador está abaixo do score mínimo. */}
              <section className="space-y-3">
                <h2 className="subtitulo">Precisa de você</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CardMetrica
                    rotulo="Aguardando aprovação"
                    valor={resumo.campanhasAguardandoAprovacao}
                    icone="fa-hourglass-half"
                    tom={tomPendencia(resumo.campanhasAguardandoAprovacao)}
                    para="/admin/aprovar-campanhas"
                  />
                  <CardMetrica
                    rotulo="Denúncias pendentes"
                    valor={resumo.denunciasPendentes}
                    icone="fa-flag"
                    tom={tomPendencia(resumo.denunciasPendentes)}
                  />
                  <CardMetrica
                    rotulo="Fila com score baixo"
                    valor={resumo.campanhasParaRevisaoScore}
                    icone="fa-star-half-stroke"
                    tom={tomPendencia(resumo.campanhasParaRevisaoScore)}
                    para="/admin/aprovar-campanhas"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="subtitulo">Plataforma</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <CardMetrica rotulo="Usuários" valor={resumo.totalUsuarios} icone="fa-users" para="/admin/usuarios" />
                  <CardMetrica
                    rotulo="Pesquisadores"
                    valor={resumo.totalPesquisadores}
                    icone="fa-flask"
                    para="/admin/pesquisadores"
                  />
                  <CardMetrica
                    rotulo="Campanhas"
                    valor={resumo.totalCampanhas}
                    icone="fa-bullhorn"
                    para="/admin/campanhas"
                  />
                  <CardMetrica
                    rotulo="Arrecadado (total)"
                    valor={resumo.valorTotalArrecadado}
                    icone="fa-sack-dollar"
                    moeda
                  />
                </div>
              </section>

              {/* Campanhas por status (RF-084): o requisito pede essa quebra, não só o total. */}
              <section className="space-y-3">
                <h2 className="subtitulo">Campanhas por situação</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <CardMetrica
                    rotulo="Ativas"
                    valor={resumo.campanhasAtivas}
                    icone="fa-rocket"
                    para={campanhasCom('ativo')}
                  />
                  <CardMetrica
                    rotulo="Com sucesso"
                    valor={resumo.campanhasSucesso}
                    icone="fa-trophy"
                    para={campanhasCom('sucesso')}
                  />
                  <CardMetrica
                    rotulo="Não atingidas"
                    valor={resumo.campanhasNaoAtingida}
                    icone="fa-arrow-trend-down"
                    para={campanhasCom('nao_atingido')}
                  />
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {/* Feed de atividade (como o painel do Kickstarter): as últimas ações, com ícone por tipo. */}
                <section className="cartao-painel p-5 lg:col-span-2">
                  <h2 className="subtitulo mb-3">Sua atividade recente</h2>
                  {!atividade?.length ? (
                    <p className="text-sm texto-fraco">Nenhuma ação registrada ainda.</p>
                  ) : (
                    <ul>
                      {atividade.slice(0, 6).map((item) => {
                        const operacao = OPERACAO[item.operacao] ?? { verbo: item.operacao.toLowerCase(), icone: 'fa-circle' };
                        return (
                          <li
                            key={item.idLog}
                            className="py-2.5 flex items-center gap-3 text-sm border-b borda-padrao last:border-b-0"
                          >
                            <span
                              className="w-8 h-8 shrink-0 rounded-lg brilho-marca texto-marca flex items-center justify-center text-xs"
                              aria-hidden="true"
                            >
                              <i className={'fa-solid ' + operacao.icone}></i>
                            </span>
                            <span className="flex-1 min-w-0 texto-padrao">
                              Você {operacao.verbo} <span className="font-semibold">{item.tabela}</span> #
                              {item.identidadeRegistro}
                            </span>
                            <span className="text-xs texto-fraco shrink-0">{formatarDataHora(item.ocorridoEm)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Números que mudam pouco: lista compacta em vez de 3 cards grandes. */}
                <section className="cartao-painel p-5">
                  <h2 className="subtitulo mb-3">Sistema</h2>
                  <ul className="space-y-1 text-sm">
                    {[
                      { rotulo: 'Papéis', valor: resumo.totalPapeis, icone: 'fa-user-shield', para: '/admin/papeis' },
                      { rotulo: 'Permissões', valor: resumo.totalPermissoes, icone: 'fa-key', para: '/admin/papeis' },
                      {
                        rotulo: 'Parâmetros do sistema',
                        valor: resumo.totalConfiguracoes,
                        icone: 'fa-sliders',
                        para: '/admin/configuracoes',
                      },
                    ].map((linha) => (
                      <li key={linha.rotulo}>
                        <Link
                          to={linha.para}
                          className="flex items-center gap-3 rounded-lg px-2 py-2 hover-fundo-sutil transition-colors"
                        >
                          <i className={'fa-solid w-4 text-center texto-marca ' + linha.icone} aria-hidden="true"></i>
                          <span className="flex-1 texto-padrao">{linha.rotulo}</span>
                          <span className="font-bold texto-forte">{linha.valor}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
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
        </div>
      )}

      {abaAtiva === 'regras' && <DashboardRegrasNegocio auth={auth} />}
      {abaAtiva === 'identidade' && <DashboardIdentidadeVisual />}
      {abaAtiva === 'saude' && <DashboardSaude bancoConectado={bancoConectado} resumo={resumo} />}
    </div>
  );
}
