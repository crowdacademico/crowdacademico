// Campo de Testes é parte permanente do painel administrativo (não uma ferramenta de teste descartável), com o
// mesmo padrão de dados/comportamento do resto do sistema (nunca uma versão simplificada à parte).

import { useEffect, useState } from 'react';
import { ROTULO_STATUS_CAMPANHA } from '../../services/12-campanha/constants/status-campanha.constants';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { LIMITE_SUGESTOES_COMBOBOX } from '../../services/campo-testes/constants/campo-testes.constants';
import { contemTermo, normalizarBusca } from '../../services/constant/util/busca.util';
import { useAuthFetchRegistrado, useChamadaRegistrada } from '../../services/campo-testes/hook/use-chamada-registrada';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { CAMPANHA_BLOQUEADA, motivoBloqueioCampanha } from '../../services/campo-testes/util/registros-bloqueados.util';
import { TabelaBancadaCampanha } from '../../components/crud/tabelas/9-tabela-bancada-campanha';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { BotaoCriar } from '../../components/crud/botao-criar';
import { ConfirmacaoDigitada } from '../../components/input/confirmacao-digitada';
import { confirmacaoConfere } from '../../components/input/confirmacao-confere';
import { CaixaBuscaSugestoes } from '../../components/input/caixa-busca-sugestoes';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';

import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { RegistroChamadas } from './registro-chamadas';
import { ModalComentarParaOutro } from './modal-comentar-para-outro';
import { ModalAlterarCampanha } from '../12-campanha/modal-alterar-campanha';
import { ModalConsultarCampanha } from '../12-campanha/modal-consultar-campanha';
import { ModalCriarCampanha } from '../12-campanha/modal-criar-campanha';
import { SecaoDecisaoAprovacao } from '../12-campanha/decisao-aprovacao';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
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
// `campanhaFoco`.

export function BancadaCampanha({ auth }: PropsPagina) {
  const chamarERegistrar = useChamadaRegistrada(auth);
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const { ocupado: excluindoForcado, executar: executarExcluindoForcado } = useEnvio(reportarErro);
  const { ocupado: excluindo, executar: executarExcluindo } = useEnvio(reportarErro);

  // As chamadas do T2 aparecem no Registro de Chamadas, inclusive as do painel e do passo a passo
  // compartilhados (views/12-campanha), que recebem este `authFetch`.
  const authRegistrado = { authFetch: useAuthFetchRegistrado(auth) };

  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [perfisPesquisador, setPerfisPesquisador] = useState<PerfilPesquisadorResponse[]>([]);
  const [campanhas, setCampanhas] = useState<CampanhaResponse[]>([]);
  const [campanhaConsultada, setCampanhaConsultada] = useState<CampanhaResponse | null>(null);

  const [idCampanhaEditando, setIdCampanhaEditando] = useState<number | null>(null);
  const [campanhaExcluindo, setCampanhaExcluindo] = useState<CampanhaResponse | null>(null);
  const [campanhaComentando, setCampanhaComentando] = useState<CampanhaResponse | null>(null);
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState('');
  const [confirmacaoExclusaoForcada, setConfirmacaoExclusaoForcada] = useState('');

  // Criar Campanha: o Admin cria uma campanha e ASSOCIA um pesquisador a ela; mesmo padrão de "Criar Perfil
  // Pesquisador" em T1. Usa POST /campanha/:idUsuario (endpoint de suporte/admin, ver
  // campanha.controller.create-for-other.ts).
  const [criandoCampanha, setCriandoCampanha] = useState(false);
  // Combobox de pesquisador (digitar "24" ou "marina", aparece até 5): não é um <select> (a lista de TODOS os
  // usuários seria enorme e sem indicar quem já é pesquisador de verdade). Busca por id OU pedaço do nome, até
  // 5 resultados; cada resultado mostra se dá para escolher (pesquisador ativo) ou não (sem perfil / suspenso),
  // com o motivo explícito: nunca deixa escolher quem não pode (o backend também recusaria, mas é melhor a
  // pessoa nunca tentar).
  const [pesquisadorEscolhido, setPesquisadorEscolhido] = useState<UsuarioResponse | null>(null);
  const [buscaPesquisador, setBuscaPesquisador] = useState('');

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
    usuarioApi.listar(auth.authFetch).then(setUsuarios).catch(() => {});
    perfilPesquisadorApi.listar(auth.authFetch).then(setPerfisPesquisador).catch(() => {});
    carregarCampanhas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.carregando]);

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
    const termo = normalizarBusca(buscaPesquisador);
    if (!termo) return [];
    return usuarios
      .filter((usuario) => String(usuario.idUsuario).includes(termo) || contemTermo(usuario.nome, termo))
      .slice(0, LIMITE_SUGESTOES_COMBOBOX);
  })();

  const iniciarEdicaoCampanha = (item: CampanhaResponse) => {
    setIdCampanhaEditando(item.idCampanha);
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
    await executarExcluindo(async () => {
      await chamarERegistrar<void>(`/campanha/${campanhaExcluindo.idCampanha}`, { method: 'DELETE' });
      carregarCampanhas();
      mostrar('Campanha excluída com sucesso.', `ID: ${campanhaExcluindo.idCampanha} foi excluída`);
      setCampanhaExcluindo(null);
      setConfirmacaoExclusao('');
    });
  };

  // forcar_exclusao_campanha(): o Admin precisa poder excluir forçadamente uma campanha, senão o Campo de
  // Testes fica muito sujo. Ignora status de propósito (POST /campanha/:id/forcar-exclusao, endpoint separado
  // do DELETE normal, que só libera 'rascunho'). Só oferecida quando a campanha NÃO é uma das 10 de
  // demonstração: essas continuam protegidas de qualquer exclusão, forçada ou não.
  const forcarExclusaoCampanha = async () => {
    if (!campanhaExcluindo) return;
    await executarExcluindoForcado(async () => {
      await chamarERegistrar<void>(`/campanha/${campanhaExcluindo.idCampanha}/forcar-exclusao`, { method: 'POST' });
      carregarCampanhas();
      mostrar('Campanha excluída à força com sucesso.', `ID: ${campanhaExcluindo.idCampanha} foi excluída`);
      setCampanhaExcluindo(null);
      setConfirmacaoExclusaoForcada('');
    });
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
          <BotaoCriar aoClicar={() => setCriandoCampanha(true)} />
        </div>
      </div>

      <TabelaBancadaCampanha
        campanhas={campanhas}
        nomeDe={nomeDe}
        aoAlterar={iniciarEdicaoCampanha}
        aoConsultar={setCampanhaConsultada}
        aoExcluir={setCampanhaExcluindo}
        aoComentar={setCampanhaComentando}
      />

      {campanhaComentando && (
        <ModalComentarParaOutro
          authFetch={authRegistrado.authFetch}
          campanha={campanhaComentando}
          pesquisadores={perfisPesquisador
            .filter((perfil) => perfil.statusPesquisador === 'ativo' && perfil.idUsuario !== campanhaComentando.idUsuario)
            .map((perfil) => ({ idUsuario: perfil.idUsuario, nome: nomeDe(perfil.idUsuario) }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))}
          aoFechar={() => setCampanhaComentando(null)}
        />
      )}

      {/* Consultar: o mesmo modal da tela Campanhas (views/12-campanha/modal-consultar-campanha.tsx), com as chamadas
          aparecendo no Registro de Chamadas. */}
      {campanhaConsultada && (
        <ModalConsultarCampanha auth={authRegistrado} idCampanha={campanhaConsultada.idCampanha} aoFechar={() => setCampanhaConsultada(null)} />
      )}

      {/* Alterar: o mesmo modal de Minhas Campanhas (views/12-campanha/modal-alterar-campanha.tsx). O T2 só
          acrescenta o que é de admin: o aviso das 10 campanhas de demonstração (só leitura) e, enquanto a
          campanha aguarda aprovação, o checklist "Pronta para aprovar?" com Aprovar e Rejeitar. */}
      {idCampanhaEditando !== null && (() => {
        const campanhaEmEdicao = campanhas.find((c) => c.idCampanha === idCampanhaEditando) ?? null;
        const bloqueadaEdicao = CAMPANHA_BLOQUEADA(idCampanhaEditando);
        // Rascunho continua no passo a passo, como em Minhas Campanhas.
        if (campanhaEmEdicao?.status === 'rascunho' && !bloqueadaEdicao) {
          return (
            <ModalCriarCampanha
              auth={authRegistrado}
              idRascunho={idCampanhaEditando}
              contexto={`Pesquisador: ${nomeDe(campanhaEmEdicao.idUsuario)}.`}
              aoMudar={carregarCampanhas}
              aoFechar={() => setIdCampanhaEditando(null)}
            />
          );
        }
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
              // A mesma decisão da fila real (Aprovar Campanhas). Aprovar ou rejeitar fecha o modal: mudar de status
              // torna o resto do formulário obsoleto. As chamadas aparecem no Registro de Chamadas.
              return (
                <SecaoDecisaoAprovacao
                  key={campanha.idCampanha}
                  authFetch={authRegistrado.authFetch}
                  campanha={campanha}
                  orcamento={orcamento}
                  cronograma={cronograma}
                  reportarErro={reportarErro}
                  aoConcluido={() => {
                    setIdCampanhaEditando(null);
                    carregarCampanhas();
                  }}
                />
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
              <RodapeAcoes
                aoCancelar={fecharModal}
                rotuloCancelar={bloqueadaDemo ? 'Fechar' : 'Cancelar'}
                acao={
                  statusNaoElegivel
                    ? {
                        rotulo: 'Forçar exclusão',
                        rotuloOcupado: 'Excluindo...',
                        ocupado: excluindoForcado,
                        desabilitado:
                          !confirmacaoConfere(confirmacaoExclusaoForcada, campanhaExcluindo.titulo),
                        aoClicar: () => void forcarExclusaoCampanha(),
                        perigo: true,
                      }
                    : !bloqueadaDemo
                      ? {
                          rotulo: 'Confirmar exclusão',
                          rotuloOcupado: 'Excluindo...',
                          ocupado: excluindo,
                          desabilitado:
                            !confirmacaoConfere(confirmacaoExclusao, campanhaExcluindo.titulo),
                          aoClicar: () => void excluirCampanha(),
                          perigo: true,
                        }
                      : undefined
                }
              />
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
              <CaixaAviso titulo="Não dá pra excluir esta campanha" tom="erro" icone="fa-lock">
                <p>{motivoBloqueioCampanha()}</p>
              </CaixaAviso>
            )}

            {statusNaoElegivel && (
              <>
                <CaixaAviso titulo="Exclusão normal indisponível">
                  <p>
                    Só dá pra excluir campanhas em "rascunho" - esta já passou desse ponto
                    (foi enviada pra aprovação ou aprovada).
                  </p>
                </CaixaAviso>

                <CaixaAviso titulo="Forçar exclusão (ignora a proteção acima)" tom="erro" icone="fa-triangle-exclamation">
                  <p className="mb-3">
                    Ferramenta de limpeza do Campo de Testes - apaga a campanha de VERDADE
                    (`DELETE`, com cascata), não importa o status. Numa campanha real, com
                    contribuição/repasse em andamento, isso destruiria dado financeiro de
                    verdade - só use em campanha de teste.
                  </p>
                  <ConfirmacaoDigitada
                    oQue="o título"
                    esperado={campanhaExcluindo.titulo}
                    valor={confirmacaoExclusaoForcada}
                    aoMudar={setConfirmacaoExclusaoForcada}
                  />
                </CaixaAviso>
              </>
            )}

            {!bloqueadaDemo && !statusNaoElegivel && (
              <>
                <CaixaAviso titulo="O que acontece de verdade">
                  <p>
                    Diferente de excluir um usuário, isto é uma exclusão de VERDADE (`DELETE`), não
                    lógica - a linha some do banco pra sempre, junto com orçamento, cronograma e tudo
                    que já foi ligado a ela (cascata). Só é permitido enquanto a campanha ainda é
                    um "rascunho" - depois de enviada pra aprovação, o banco recusa.
                  </p>
                </CaixaAviso>

                <ConfirmacaoDigitada
                  oQue="o título"
                  esperado={campanhaExcluindo.titulo}
                  valor={confirmacaoExclusao}
                  aoMudar={setConfirmacaoExclusao}
                />
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
        <CaixaBuscaSugestoes
          className="sm:col-span-2"
          rotulo="Dono da campanha"
          dica="Precisa ser um pesquisador ativo: quem não tem perfil de pesquisador ou está suspenso aparece na lista, mas não dá pra escolher."
          placeholder="Digite o id ou o nome..."
          valor={buscaPesquisador}
          aoDigitar={(texto) => {
            setBuscaPesquisador(texto);
            setPesquisadorEscolhido(null);
          }}
          sugestoes={sugestoesPesquisador.map((usuario) => {
            const status = statusPesquisadorParaCriar(usuario.idUsuario);
            return {
              id: usuario.idUsuario,
              texto: usuario.nome,
              desabilitada: status !== 'ativo',
              extra:
                status === 'sem-perfil' ? (
                  <span className="legenda texto-erro">não é pesquisador</span>
                ) : status === 'suspenso' ? (
                  <span className="legenda texto-erro">pesquisador suspenso</span>
                ) : null,
            };
          })}
          aoEscolher={(sugestao) => {
            setPesquisadorEscolhido(sugestoesPesquisador.find((usuario) => usuario.idUsuario === sugestao.id) ?? null);
            setBuscaPesquisador(sugestao.texto);
          }}
        />
      </SecaoFicha>
          }
          camposExtrasValidos={pesquisadorEscolhido !== null}
          subtituloDados="Em nome de outro pesquisador - escolha quem é o dono abaixo."
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
