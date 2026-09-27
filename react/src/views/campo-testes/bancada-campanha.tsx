// Campo de Testes é parte permanente do painel administrativo (não uma ferramenta de teste descartável), com o
// mesmo padrão de dados/comportamento do resto do sistema (nunca uma versão simplificada à parte).

import { useEffect, useId, useRef, useState } from 'react';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useFecharAoClicarFora } from '../../services/constant/hook/use-fechar-ao-clicar-fora';
import { LIMITE_SUGESTOES_COMBOBOX } from '../../services/campo-testes/constants/campo-testes.constants';
import { useAuthFetchRegistrado, useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { useRegrasCampanha } from '../../services/12-campanha/hook/use-regras-campanha';
import { CAMPANHA_BLOQUEADA, motivoBloqueioCampanha } from '../../services/campo-testes/util/registros-bloqueados';
import { TabelaBancadaCampanha } from '../../components/crud/tabelas/9-tabela-bancada-campanha';
import { TabelaCriteriosEnvio } from '../../components/crud/tabelas/7-tabela-criterios-envio';
import { avaliarCriteriosEnvio } from '../../services/12-campanha/util/criterios-envio.util';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import {
  ROTULO_STATUS_CAMPANHA,
  classeBadgeStatusCampanha,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { formatarDataHora, formatarMoeda } from '../../services/constant/utils/formatacao.util';
import { RegistroChamadas } from './registro-chamadas';
import { ModalAlterarCampanha } from '../12-campanha/modal-alterar-campanha';
import { ModalCriarCampanha } from '../12-campanha/modal-criar-campanha';
import { PainelOrcamentoCronograma } from '../12-campanha/painel-orcamento-cronograma';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse, HistoricoRejeicaoResponse } from '../../services/12-campanha/type/campanha.type';
import type { AreaConhecimentoResponse } from '../../services/8-area-conhecimento/type/area-conhecimento.type';
import type { UsuarioResponse } from '../../services/1-usuario/type/usuario.type';
import type { PerfilPesquisadorResponse } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

// O painel de orçamento/cronograma e o passo a passo de criação vivem em views/12-campanha (compartilhados com
// Minhas Campanhas).

// T2, Bancada da Campanha. Toda chamada usa a sessão REAL do painel (`auth`, sempre um admin): leituras sempre
// funcionaram assim (relatorio_visualizar vê tudo); as ESCRITAS que fazem sentido aqui (Alterar,
// orçamento/cronograma, Aprovar, Rejeitar, Excluir) também: o admin já tem
// `campanha_editar`/`campanha_aprovar`/`campanha_rejeitar`, e a RLS libera não importa quem seja o dono de
// verdade (04_rls_policies.sql, pol_campanha_update). Criar campanha aqui usa o endpoint de suporte/admin (POST
// /campanha/:idUsuario), porque a RLS exige id_usuario = id_usuario_atual() e não dá para "criar em nome de" um
// pesquisador escolhido sem personificação.
//
// Sem pré-filtro por pesquisador nem "Escolher"/"campanha em foco": o checklist "Pronta para aprovar?" +
// Aprovar/Rejeitar + Orçamento/Cronograma fazem parte do modal de Alterar, e `CampoTestesContext` não guarda
// `campanhaFoco`; T3 (Vida da Campanha Ativa) tem busca própria (ver vida-campanha-ativa.tsx).

export function BancadaCampanha({ auth }: PropsPagina) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();

  // As chamadas do T2 aparecem no T4 (Registro de Chamadas), inclusive as do painel e do passo a passo
  // compartilhados (views/12-campanha), que recebem este `authFetch`.
  const authRegistrado = { authFetch: useAuthFetchRegistrado(auth) };
  const { minimoItensOrcamento, minimoMarcosCronograma } = useRegrasCampanha();

  const [areas, setAreas] = useState<AreaConhecimentoResponse[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [perfisPesquisador, setPerfisPesquisador] = useState<PerfilPesquisadorResponse[]>([]);
  const [campanhas, setCampanhas] = useState<CampanhaResponse[]>([]);
  const [campanhaConsultada, setCampanhaConsultada] = useState<CampanhaResponse | null>(null);
  const [historicoRejeicaoConsultada, setHistoricoRejeicaoConsultada] = useState<HistoricoRejeicaoResponse[]>([]);

  // Histórico de rejeições da campanha aberta em Consultar: mesmo dado/mesma chamada de
  // modal-consultar-campanha.tsx (esta tela é uma cópia manual da página real, ver comentário grande perto do
  // modal, "Consultar replica a página real"); manter os dois em sincronia.
  useEffect(() => {
    if (campanhaConsultada) {
      campanhaApi
        .listarHistoricoRejeicao(auth.authFetch, campanhaConsultada.idCampanha)
        .then(setHistoricoRejeicaoConsultada)
        .catch(() => setHistoricoRejeicaoConsultada([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanhaConsultada]);
  const [idCampanhaEditando, setIdCampanhaEditando] = useState<number | null>(null);
  const prefixoId = useId();
  const idCampo = (nome: string) => `${prefixoId}-${nome}`;
  const [justificativaRejeicaoEdicao, setJustificativaRejeicaoEdicao] = useState('');
  const [aprovando, setAprovando] = useState(false);
  const [rejeitando, setRejeitando] = useState(false);
  const [campanhaExcluindo, setCampanhaExcluindo] = useState<CampanhaResponse | null>(null);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [confirmacaoExclusaoForcada, setConfirmacaoExclusaoForcada] = useState('');
  const [excluindoForcado, setExcluindoForcado] = useState(false);

  // Criar Campanha: o Admin cria uma campanha e ASSOCIA um pesquisador a ela; mesmo padrão de "Criar Perfil
  // Pesquisador" em T1. Usa POST /campanha/:idUsuario (endpoint de suporte/admin, ver
  // campanha.controller.create-para-outro.ts).
  const [criandoCampanha, setCriandoCampanha] = useState(false);
  // Combobox de pesquisador (digitar "24" ou "marina", aparece até 5): não é um <select> (a lista de TODOS os
  // usuários seria enorme e sem indicar quem já é pesquisador de verdade). Busca por id OU pedaço do nome, até
  // 5 resultados; cada resultado mostra se dá para escolher (pesquisador ativo) ou não (sem perfil / suspenso),
  // com o motivo explícito: nunca deixa escolher quem não pode (o backend também recusaria, mas é melhor a
  // pessoa nunca tentar).
  const [pesquisadorEscolhido, setPesquisadorEscolhido] = useState<UsuarioResponse | null>(null);
  const [buscaPesquisador, setBuscaPesquisador] = useState('');
  const [sugestoesPesquisadorAbertas, setSugestoesPesquisadorAbertas] = useState(false);
  const sugestoesPesquisadorRef = useRef<HTMLDivElement>(null);

  const carregarCampanhas = () => {
    campanhaApi.listar(auth.authFetch).then(setCampanhas).catch(() => {});
  };

  // Espera a sessão ser restaurada (`auth.carregando`) antes de buscar: num F5,
  // o authFetch ainda não tem token e a listagem vinha só com as campanhas
  // públicas.
  useEffect(() => {
    if (auth.carregando) {
      return;
    }
    areaConhecimentoApi
      .listar(auth.authFetch)
      .then((lista) => setAreas(lista.filter((area) => area.idPai !== null)))
      .catch(() => {});
    usuarioApi.listar(auth.authFetch).then(setUsuarios).catch(() => {});
    perfilPesquisadorApi.listar(auth.authFetch).then(setPerfisPesquisador).catch(() => {});
    carregarCampanhas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.carregando]);

  // Fechar as sugestões do combobox de pesquisador ao clicar fora (`useFecharAoClicarFora`). O dropdown
  // "Status" tem o próprio fechamento embutido em `BarraFiltros`.
  useFecharAoClicarFora(sugestoesPesquisadorRef, sugestoesPesquisadorAbertas, () => setSugestoesPesquisadorAbertas(false));

  const nomeDe = (idUsuario: number): string => usuarios.find((u) => u.idUsuario === idUsuario)?.nome ?? `#${idUsuario}`;

  // 'ativo' = pode ser escolhido pra Criar Campanha; 'suspenso'/'sem-perfil'
  // só existem pra mostrar o motivo certo no combobox, nunca selecionáveis
  // (o backend também recusaria - criar_campanha_para_outro exige
  // status_pesquisador = 'ativo').
  const statusPesquisadorParaCriar = (idUsuario: number): 'ativo' | 'suspenso' | 'sem-perfil' => {
    const perfil = perfisPesquisador.find((p) => p.idUsuario === idUsuario);
    if (!perfil) return 'sem-perfil';
    return perfil.statusPesquisador === 'suspenso' ? 'suspenso' : 'ativo';
  };

  // Busca por id OU pedaço do nome: até 5 resultados, sem filtro nenhum além do texto digitado (mostra
  // pesquisador e não-pesquisador juntos, cada um com seu próprio aviso).
  const sugestoesPesquisador = (() => {
    const termo = buscaPesquisador.trim().toLowerCase();
    if (!termo) return [];
    return usuarios
      .filter((usuario) => String(usuario.idUsuario).includes(termo) || usuario.nome.toLowerCase().includes(termo))
      .slice(0, LIMITE_SUGESTOES_COMBOBOX);
  })();

  const iniciarEdicaoCampanha = (item: CampanhaResponse) => {
    setIdCampanhaEditando(item.idCampanha);
    setJustificativaRejeicaoEdicao('');
  };

  // Aprovar/Rejeitar dentro do modal de Alterar: escopados a `idCampanhaEditando` (o modal aberto). Fecham o
  // modal ao terminar (mudar de status torna o resto do formulário obsoleto: "Salvar" não faz mais sentido
  // depois de aprovar/rejeitar).
  const aprovarEdicao = async () => {
    if (idCampanhaEditando === null) return;
    setAprovando(true);
    try {
      await chamarERegistrar<void>(`/campanha/${idCampanhaEditando}/aprovar`, { method: 'POST' });
      mostrar('Campanha aprovada com sucesso.', `ID: ${idCampanhaEditando} foi aprovada`);
      setIdCampanhaEditando(null);
      carregarCampanhas();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setAprovando(false);
    }
  };

  const rejeitarEdicao = async () => {
    if (idCampanhaEditando === null) return;
    setRejeitando(true);
    try {
      await chamarERegistrar<void>(`/campanha/${idCampanhaEditando}/rejeitar`, {
        method: 'POST',
        body: JSON.stringify({ justificativa: justificativaRejeicaoEdicao || undefined }),
      });
      mostrar('Campanha rejeitada com sucesso.', `ID: ${idCampanhaEditando} foi rejeitada`);
      setIdCampanhaEditando(null);
      carregarCampanhas();
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setRejeitando(false);
    }
  };

  // Só permitido em 'rascunho' (RLS: pol_campanha_delete, ver 04_rls_policies.sql): uma campanha rejeitada e
  // reenviada volta para 'aguardando_aprovacao' já com linha em historico_rejeicao, cuja FK não tem ON DELETE
  // CASCADE, então o DELETE travaria em violação de FK. Cascateia
  // orçamento/cronograma/atualizações/seguidores/comentários (ON DELETE CASCADE,
  // 01_extensoes_enums_tabelas.sql), sem risco: nada disso existe ainda para uma campanha que nunca saiu do
  // rascunho.
  //
  // Exclusão de campanha é DELETE de verdade (não lógica, como usuário): merece a mesma barreira de Excluir
  // Usuário (confirmação explícita no modal), ou mais.
  const excluirCampanha = async () => {
    if (!campanhaExcluindo) return;
    setExcluindo(true);
    try {
      await chamarERegistrar<void>(`/campanha/${campanhaExcluindo.idCampanha}`, { method: 'DELETE' });
      carregarCampanhas();
      mostrar('Campanha excluída com sucesso.', `ID: ${campanhaExcluindo.idCampanha} foi excluída`);
      setCampanhaExcluindo(null);
      setConfirmacaoExclusao('');
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setExcluindo(false);
    }
  };

  // forcar_exclusao_campanha(): o Admin precisa poder excluir forçadamente uma campanha, senão o Campo de
  // Testes fica muito sujo. Ignora status de propósito (POST /campanha/:id/forcar-exclusao, endpoint separado
  // do DELETE normal, que só libera 'rascunho'). Só oferecida quando a campanha NÃO é uma das 10 de
  // demonstração: essas continuam protegidas de qualquer exclusão, forçada ou não.
  const forcarExclusaoCampanha = async () => {
    if (!campanhaExcluindo) return;
    setExcluindoForcado(true);
    try {
      await chamarERegistrar<void>(`/campanha/${campanhaExcluindo.idCampanha}/forcar-exclusao`, { method: 'POST' });
      carregarCampanhas();
      mostrar('Campanha excluída à força com sucesso.', `ID: ${campanhaExcluindo.idCampanha} foi excluída`);
      setCampanhaExcluindo(null);
      setConfirmacaoExclusaoForcada('');
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setExcluindoForcado(false);
    }
  };

  // Fecha o modal de criação e limpa a escolha do dono. A campanha já criada FICA salva como rascunho.
  const fecharModalCriarCampanha = () => {
    setCriandoCampanha(false);
    setPesquisadorEscolhido(null);
    setBuscaPesquisador('');
  };

  return (
    <div className="admin-content-painel">
      <section className="crud-secao">
      <div className="crud-secao__cabecalho">
        <h1 className="titulo-secao">Campo de Testes - Bancada da Campanha</h1>
        <div className="crud-secao__acao-topo">
          <button type="button" className="btn btn-primary" onClick={() => setCriandoCampanha(true)}>
            Criar
          </button>
        </div>
      </div>

      <TabelaBancadaCampanha
        campanhas={campanhas}
        nomeDe={nomeDe}
        aoAlterar={iniciarEdicaoCampanha}
        aoConsultar={setCampanhaConsultada}
        aoExcluir={setCampanhaExcluindo}
      />

      {/* Consultar/Alterar/Excluir em MODAL, mesmo padrão de T1 (ModalFicha + SecaoFicha/CampoFicha).
          Diferença de T1: não existe página real de Alterar/Excluir Campanha no painel admin para copiar (só
          Consultar existe, ver modal-consultar-campanha.tsx; editar/excluir campanha é ação do dono, painel
          dele ainda não construído): Consultar replica a página real; Alterar e Excluir são desenho novo,
          seguindo o mesmo padrão visual. */}
      {campanhaConsultada && (
        <ModalFicha
          titulo={campanhaConsultada.titulo}
          subtitulo={`Pesquisador: ${nomeDe(campanhaConsultada.idUsuario)}`}
          badges={[
            <span key="status" className={`badge ${classeBadgeStatusCampanha(campanhaConsultada.status)}`}>
              {ROTULO_STATUS_CAMPANHA[campanhaConsultada.status]}
            </span>,
            <span key="modelo" className="badge badge-neutro">
              {campanhaConsultada.modelo}
            </span>,
          ]}
          aoFechar={() => setCampanhaConsultada(null)}
          rodape={
            <button type="button" onClick={() => setCampanhaConsultada(null)} className="btn btn-secondary w-full">
              Fechar
            </button>
          }
        >
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <SecaoFicha titulo="Dados">
                <CampoFicha rotulo="id" valor={campanhaConsultada.idCampanha} />
                <CampoFicha
                  rotulo="Área do conhecimento"
                  valor={areas.find((a) => a.idAreaConhecimento === campanhaConsultada.idAreaConhecimento)?.nome ?? `#${campanhaConsultada.idAreaConhecimento}`}
                />
                <CampoFicha rotulo="Descrição" valor={campanhaConsultada.descricao} largura="cheia" />
                <CampoFicha rotulo="Vídeo de apresentação" valor={campanhaConsultada.videoApresentacaoUrl} largura="cheia" />
              </SecaoFicha>

              {/* Orçamento/Cronograma acima de Datas: só leitura aqui (Consultar nunca edita nada). Linha
                  divisória dos dois lados, mesmo padrão entre Links Acadêmicos e Moderação em T1. */}
              <div className="border-t borda-padrao"></div>
              <PainelOrcamentoCronograma auth={authRegistrado} idCampanha={campanhaConsultada.idCampanha} podeEditar={false} />
              <div className="border-t borda-padrao"></div>

              <SecaoFicha titulo="Datas">
                <CampoFicha rotulo="Início" valor={formatarDataHora(campanhaConsultada.dataInicio)} />
                <CampoFicha rotulo="Fim (previsto)" valor={formatarDataHora(campanhaConsultada.dataFim)} />
                <CampoFicha rotulo="Criada em" valor={formatarDataHora(campanhaConsultada.criadoEm)} />
                <CampoFicha rotulo="Aprovada em" valor={formatarDataHora(campanhaConsultada.aprovadoEm)} />
                <CampoFicha rotulo="Encerrada em" valor={formatarDataHora(campanhaConsultada.encerradoEm)} />
              </SecaoFicha>

              {/* Escondida quando vazia, mesmo critério de
                  consultar-campanha.tsx - rejeição é minoria. */}
              {historicoRejeicaoConsultada.length > 0 && (
                <SecaoFicha titulo="Histórico de Rejeições">
                  {historicoRejeicaoConsultada.map((item) => (
                    <CampoFicha
                      key={item.idRejeicao}
                      rotulo={formatarDataHora(item.rejeitadoEm)}
                      valor={`${item.justificativa ?? 'Sem justificativa registrada.'} (${item.nomeAdmin ?? 'Administrador removido'})`}
                      largura="cheia"
                    />
                  ))}
                </SecaoFicha>
              )}
            </div>

            <div className="space-y-6">
              <SecaoFicha titulo="Financeiro">
                <CampoFicha rotulo="Meta" valor={formatarMoeda(campanhaConsultada.metaFinanceira)} />
                <CampoFicha rotulo="Arrecadado" valor={formatarMoeda(campanhaConsultada.valorBrutoArrecadado)} />
                <CampoFicha
                  rotulo="Taxa da plataforma"
                  valor={campanhaConsultada.taxaPlataforma === null ? 'Ainda não carimbada (não aprovada)' : `${campanhaConsultada.taxaPlataforma}%`}
                />
              </SecaoFicha>
            </div>
          </div>
        </ModalFicha>
      )}

      {/* Alterar: o mesmo modal de Minhas Campanhas (views/12-campanha/modal-alterar-campanha.tsx). O T2 só
          acrescenta o que é de admin: o aviso das 10 campanhas de demonstração (só leitura) e, enquanto a
          campanha aguarda aprovação, o checklist "Pronta para aprovar?" com Aprovar e Rejeitar. */}
      {idCampanhaEditando !== null && (() => {
        const campanhaEmEdicao = campanhas.find((c) => c.idCampanha === idCampanhaEditando) ?? null;
        const bloqueadaEdicao = CAMPANHA_BLOQUEADA(idCampanhaEditando);
        return (
          <ModalAlterarCampanha
            auth={authRegistrado}
            idCampanha={idCampanhaEditando}
            subtitulo={campanhaEmEdicao ? `Pesquisador: ${nomeDe(campanhaEmEdicao.idUsuario)}` : undefined}
            motivoBloqueio={bloqueadaEdicao ? motivoBloqueioCampanha() : undefined}
            aoMudar={carregarCampanhas}
            aoFechar={() => setIdCampanhaEditando(null)}
            secaoAdmin={({ campanha, orcamento, cronograma }) => {
              if (bloqueadaEdicao || campanha.status !== 'aguardando_aprovacao') {
                return null;
              }
              const criterios = {
                orcamento,
                cronograma,
                metaFinanceira: campanha.metaFinanceira,
                minimoItensOrcamento,
                minimoMarcosCronograma,
              };
              const { pronta, motivo } = avaliarCriteriosEnvio(criterios);
              return (
                <div className="fundo-sutil rounded-md p-4">
                  <h3 className="subtitulo mb-3">Pronta para aprovar?</h3>
                  <TabelaCriteriosEnvio {...criterios} />

                  <div className="acao-com-motivo mt-3">
                    <button type="button" className="btn btn-primary" disabled={!pronta || aprovando} onClick={aprovarEdicao}>
                      {aprovando ? 'Aprovando...' : 'Aprovar (Admin)'}
                    </button>
                    {!pronta && <span className="acao-com-motivo__motivo">{motivo}</span>}
                  </div>

                  <div className="flex gap-2 items-end mt-3">
                    <textarea
                      placeholder="Justificativa da rejeição (opcional)"
                      value={justificativaRejeicaoEdicao}
                      onChange={(evento) => setJustificativaRejeicaoEdicao(evento.target.value)}
                      className="input-padrao flex-1"
                      rows={2}
                    />
                    <button type="button" className="btn btn-secondary text-xs" disabled={rejeitando} onClick={rejeitarEdicao}>
                      {rejeitando ? 'Rejeitando...' : 'Rejeitar (Admin)'}
                    </button>
                  </div>
                </div>
              );
            }}
          />
        );
      })()}

      {campanhaExcluindo && (() => {
        // Excluir SEMPRE abre o modal (nunca fica um botão cinza/inerte na tabela): quando a campanha não pode
        // ser excluída normalmente, o motivo aparece bem visível dentro do próprio modal, em vez de um tooltip
        // em cima de um botão desabilitado. As 10 campanhas de demonstração têm proteção TOTAL (nem "forçar"
        // funciona nelas); o resto (status que já passou de rascunho) ganha a opção de exclusão FORÇADA (POST
        // /campanha/:id/forcar-exclusao), que ignora status de propósito, gateada por permissão própria.
        const bloqueadaDemo = CAMPANHA_BLOQUEADA(campanhaExcluindo.idCampanha);
        // Só 'rascunho' é excluível normalmente (acompanha pol_campanha_delete, 04): senão a tela diria "pode
        // excluir" numa campanha que o banco recusa, e "não pode" justamente nos rascunhos, que são os únicos
        // excluíveis.
        const statusNaoElegivel = !bloqueadaDemo && campanhaExcluindo.status !== 'rascunho';
        const fecharModal = () => {
          setCampanhaExcluindo(null);
          setConfirmacaoExclusao('');
          setConfirmacaoExclusaoForcada('');
        };

        return (
          <ModalFicha
            titulo={`Excluir "${campanhaExcluindo.titulo}"`}
            subtitulo={bloqueadaDemo ? undefined : 'Não existe botão de desfazer no painel.'}
            aoFechar={fecharModal}
            rodape={
              <div className="flex gap-3 max-w-sm ml-auto">
                <button type="button" onClick={fecharModal} className="btn btn-secondary flex-1">
                  {bloqueadaDemo ? 'Fechar' : 'Cancelar'}
                </button>
                {!bloqueadaDemo && !statusNaoElegivel && (
                  <button
                    type="button"
                    onClick={excluirCampanha}
                    disabled={excluindo || confirmacaoExclusao.trim().toLowerCase() !== campanhaExcluindo.titulo.trim().toLowerCase()}
                    className="btn btn-danger flex-1"
                  >
                    {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
                  </button>
                )}
                {statusNaoElegivel && (
                  <button
                    type="button"
                    onClick={forcarExclusaoCampanha}
                    disabled={excluindoForcado || confirmacaoExclusaoForcada.trim().toLowerCase() !== campanhaExcluindo.titulo.trim().toLowerCase()}
                    className="btn btn-danger flex-1"
                  >
                    {excluindoForcado ? 'Excluindo...' : 'Forçar exclusão'}
                  </button>
                )}
              </div>
            }
          >
            <SecaoFicha titulo={bloqueadaDemo || statusNaoElegivel ? 'Dados da campanha' : 'O que será excluído'}>
              <CampoFicha rotulo="id" valor={campanhaExcluindo.idCampanha} />
              <CampoFicha rotulo="Título" valor={campanhaExcluindo.titulo} />
              <CampoFicha rotulo="Status" valor={ROTULO_STATUS_CAMPANHA[campanhaExcluindo.status]} />
              <CampoFicha rotulo="Dono" valor={nomeDe(campanhaExcluindo.idUsuario)} />
              <CampoFicha rotulo="Meta" valor={formatarMoeda(campanhaExcluindo.metaFinanceira)} largura="cheia" />
            </SecaoFicha>

            {bloqueadaDemo && (
              <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
                <p className="font-bold mb-1">
                  <i className="fa-solid fa-lock mr-1"></i> Não dá pra excluir esta campanha
                </p>
                <p>{motivoBloqueioCampanha()}</p>
              </div>
            )}

            {statusNaoElegivel && (
              <>
                <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
                  <p className="font-bold mb-1">
                    <i className="fa-solid fa-circle-info mr-1"></i> Exclusão normal indisponível
                  </p>
                  <p>
                    Só dá pra excluir campanhas em "rascunho" - esta já passou desse ponto
                    (foi enviada pra aprovação ou aprovada).
                  </p>
                </div>

                <div className="rounded-lg border borda-forte fundo-erro p-4 text-sm texto-erro">
                  <p className="font-bold mb-1">
                    <i className="fa-solid fa-triangle-exclamation mr-1"></i> Forçar exclusão (ignora a proteção acima)
                  </p>
                  <p className="mb-3">
                    Ferramenta de limpeza do Campo de Testes - apaga a campanha de VERDADE
                    (`DELETE`, com cascata), não importa o status. Numa campanha real, com
                    contribuição/repasse em andamento, isso destruiria dado financeiro de
                    verdade - só use em campanha de teste.
                  </p>
                  <label htmlFor={idCampo('excluir-forcada')} className="rotulo-campo">
                    Digite o título "{campanhaExcluindo.titulo}" pra confirmar
                  </label>
                  <input
                    id={idCampo('excluir-forcada')}
                    type="text"
                    value={confirmacaoExclusaoForcada}
                    onChange={(evento) => setConfirmacaoExclusaoForcada(evento.target.value)}
                    className="input-padrao"
                    placeholder={campanhaExcluindo.titulo}
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            {!bloqueadaDemo && !statusNaoElegivel && (
              <>
                <div className="rounded-lg border borda-forte fundo-aviso p-4 text-sm texto-aviso">
                  <p className="font-bold mb-1">
                    <i className="fa-solid fa-circle-info mr-1"></i> O que acontece de verdade
                  </p>
                  <p>
                    Diferente de excluir um usuário, isto é uma exclusão de VERDADE (`DELETE`), não
                    lógica - a linha some do banco pra sempre, junto com orçamento, cronograma e tudo
                    que já foi ligado a ela (cascata). Só é permitido enquanto a campanha ainda é
                    um "rascunho" - depois de enviada pra aprovação, o banco recusa.
                  </p>
                </div>

                <div>
                  <label htmlFor={idCampo('excluir')} className="rotulo-campo">
                    Digite o título "{campanhaExcluindo.titulo}" pra confirmar
                  </label>
                  <input
                    id={idCampo('excluir')}
                    type="text"
                    value={confirmacaoExclusao}
                    onChange={(evento) => setConfirmacaoExclusao(evento.target.value)}
                    className="input-padrao"
                    placeholder={campanhaExcluindo.titulo}
                    autoComplete="off"
                  />
                </div>
              </>
            )}
          </ModalFicha>
        );
      })()}

      {/* Criar Campanha: o Admin cria uma campanha e ASSOCIA um pesquisador a ela (POST /campanha/:idUsuario, o
          endpoint de suporte/admin: a RLS exige id_usuario = id_usuario_atual(), então o endpoint normal não
          cria "em nome de" outro). O passo a passo é o mesmo de Minhas Campanhas (ModalCriarCampanha); aqui
          só entra o campo "Dono da campanha" e o criar em nome dele. */}
      {criandoCampanha && (
        <ModalCriarCampanha
          auth={authRegistrado}
          criar={(dados) => {
            if (!pesquisadorEscolhido) {
              return Promise.reject(new Error('Escolha o dono da campanha.'));
            }
            return campanhaApi.criarParaOutro(authRegistrado.authFetch, pesquisadorEscolhido.idUsuario, dados);
          }}
          camposExtras={
      <SecaoFicha titulo="Pesquisador">
        <div className="sm:col-span-2 relative" ref={sugestoesPesquisadorRef}>
          <label htmlFor={idCampo('criar-dono')} className="rotulo-campo">Dono da campanha</label>
          {/* Um só <input>, sempre: não troca para um "chip" separado depois de escolher. O texto
              mostrado É o nome escolhido; clicar/focar reabre a lista de sugestões já filtrada por esse
              mesmo nome (ex.: "Maria da Silva" escolhida, clicar mostra "Maria da Silva", "Maria da
              Silva Junior"...); a escolha atual continua valendo até a pessoa clicar numa sugestão
              diferente ou digitar algo nesse meio tempo (que invalida a escolha, mesmo padrão de
              qualquer combobox de busca). */}
          <input
            id={idCampo('criar-dono')}
            type="text"
            value={buscaPesquisador}
            onChange={(evento) => {
              setBuscaPesquisador(evento.target.value);
              setPesquisadorEscolhido(null);
              setSugestoesPesquisadorAbertas(true);
            }}
            onFocus={() => setSugestoesPesquisadorAbertas(true)}
            placeholder="Digite o id ou o nome..."
            className="input-padrao"
            autoComplete="off"
          />
          {sugestoesPesquisadorAbertas && sugestoesPesquisador.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
              {sugestoesPesquisador.map((usuario) => {
                const status = statusPesquisadorParaCriar(usuario.idUsuario);
                const podeEscolher = status === 'ativo';
                return (
                  <button
                    key={usuario.idUsuario}
                    type="button"
                    disabled={!podeEscolher}
                    onClick={() => {
                      if (!podeEscolher) return;
                      setPesquisadorEscolhido(usuario);
                      setBuscaPesquisador(usuario.nome);
                      setSugestoesPesquisadorAbertas(false);
                    }}
                    className={
                      'w-full text-left px-3 py-2 text-sm border-b borda-padrao last:border-b-0 flex items-center justify-between gap-2 ' +
                      (podeEscolher ? 'hover-fundo-marca-suave' : 'opacity-60 cursor-not-allowed')
                    }
                  >
                    <span className="texto-forte inline-flex items-baseline">
                      <span className="inline-block w-16 shrink-0 tabular-nums">ID: {usuario.idUsuario}</span>
                      <span>{usuario.nome}</span>
                    </span>
                    {status === 'sem-perfil' && <span className="text-xs texto-erro">não é pesquisador</span>}
                    {status === 'suspenso' && <span className="text-xs texto-erro">pesquisador suspenso</span>}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs texto-fraco mt-1">
            Precisa ser um pesquisador ativo - quem não tem perfil de pesquisador ou está
            suspenso aparece na lista, mas não dá pra escolher.
          </p>
        </div>
      </SecaoFicha>
          }
          camposExtrasValidos={pesquisadorEscolhido !== null}
          subtituloDados="Em nome de outro pesquisador - escolha quem é o dono abaixo. Etapa 1 de 3: Dados."
          aoMudar={carregarCampanhas}
          aoFechar={fecharModalCriarCampanha}
        />
      )}

      {/* Criar campanha usa POST /campanha/:idUsuario (suporte/admin): a RLS exige id_usuario =
          id_usuario_atual(), então não dá para "criar em nome de" um pesquisador escolhido pelo endpoint
          normal. */}

      <div className="border-t borda-padrao my-8"></div>

      <RegistroChamadas />
      </section>
    </div>
  );
}
