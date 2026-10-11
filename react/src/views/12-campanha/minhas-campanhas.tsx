import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { AvisoSoPesquisador } from '../../components/crud/aviso-so-pesquisador';
import { GenericTable } from '../../components/crud/generic-table';
import { BotaoCriar } from '../../components/crud/botao-criar';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ORDEM_ROTULOS_STATUS_CAMPANHA, rotuloStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import { useSituacaoPesquisador } from '../../services/6-perfil-pesquisador/hook/use-situacao-pesquisador';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { ModalAlterarCampanha } from './modal-alterar-campanha';
import { ModalConsultarCampanha } from './modal-consultar-campanha';
import { ModalCriarCampanha } from './modal-criar-campanha';
import { ModalExcluirCampanha } from './modal-excluir-campanha';
import { renderizarStatus } from './colunas-campanha';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

interface MinhaCampanhaLinha extends Omit<CampanhaResponse, 'status'> {
  status: string;
  statusOriginal: CampanhaResponse['status'];
}

// Minhas Campanhas: as campanhas do PRÓPRIO usuário logado, em qualquer status (a RLS deixa o dono ver as
// suas). Criar abre o passo a passo (Dados, Orçamento, Cronograma, Revisão); o rascunho continua SEMPRE nele
// (Alterar de um rascunho reabre o passo a passo). Para os outros status, Alterar serve para ajustar
// orçamento/cronograma enquanto não foi aprovada e corrigir e reenviar uma rejeitada; depois de aprovada, os campos
// travados aparecem desabilitados. Excluir só vale para rascunho (o modal explica quando
// não pode). Consultar mostra também os comentários recebidos (endossar, excluir, bloquear).
//
// Criar só aparece para quem tem perfil de pesquisador ATIVO (a mesma condição de pol_campanha_insert, 04):
// para os outros, a tela explica o porquê em vez de oferecer um botão que o banco recusaria.
export function MinhasCampanhas({ auth }: PropsPagina) {
  const idUsuario = auth.usuario?.idUsuario ?? null;
  const statusPesquisador = useSituacaoPesquisador(auth.authFetch, auth.usuario);
  const {
    criando,
    abrirCriando,
    fecharCriando,
    alterando,
    consultando,
    excluindo,
    fecharAlterando,
    fecharConsultando,
    fecharExcluindo,
    chaveRecarga,
    recarregar,
    acoesCompletas,
  } = useCrudModais<MinhaCampanhaLinha>();

  const listar = useCallback(async (): Promise<MinhaCampanhaLinha[]> => {
    if (idUsuario === null) {
      return [];
    }
    const campanhas = await campanhaApi.listar(auth.authFetch, { idUsuario });
    return campanhas.map((campanha) => ({
      ...campanha,
      status: rotuloStatusCampanha(campanha),
      statusOriginal: campanha.status,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idUsuario, chaveRecarga]);

  const podeCriar = statusPesquisador === 'ativo';
  // "Submeter Pesquisa" (cabeçalho) chega com ?criar=1: abre o Criar direto para quem pode criar. Para quem não pode,
  // o aviso no topo da página já diz por quê (não é pesquisador, ou está suspenso).
  const [parametros, setParametros] = useSearchParams();
  const pediuCriar = parametros.get('criar') === '1';
  const fecharCriar = () => {
    if (pediuCriar) {
      setParametros(
        (atuais) => {
          atuais.delete('criar');
          return atuais;
        },
        { replace: true },
      );
    }
    fecharCriando();
  };

  return (
    <div className="admin-content-painel">
      {statusPesquisador !== null && !podeCriar && (
        <AvisoSoPesquisador situacao={statusPesquisador} fazem="criam campanhas" fazer="criar campanhas" className="mb-6" />
      )}

      <GenericTable<MinhaCampanhaLinha>
        titulo="Minhas Campanhas"
        ajuda="Crie, acompanhe e ajuste as suas campanhas. Os comentários recebidos ficam no Consultar."
        acaoTopo={
          podeCriar && (
            <BotaoCriar rotulo="Criar campanha" aoClicar={abrirCriando} />
          )
        }
        colunas={[
          { chave: 'idCampanha', rotulo: 'id', tipo: 'id' },
          { chave: 'titulo', rotulo: 'título', tipo: 'nome', umaLinha: true },
          { chave: 'status', rotulo: 'status', tipo: 'status', renderizar: renderizarStatus },
          { chave: 'metaFinanceira', rotulo: 'meta', tipo: 'dinheiro' },
          { chave: 'valorBrutoArrecadado', rotulo: 'arrecadado', tipo: 'dinheiro' },
          { chave: 'dataFim', rotulo: 'termina em', tipo: 'data' },
        ]}
        chavePrimaria="idCampanha"
        vazio={{
          icone: 'fa-flask',
          titulo: 'Você ainda não tem campanhas.',
          texto: podeCriar
            ? 'Clique em "Criar campanha" para começar: dados, orçamento e cronograma, em 3 etapas.'
            : 'Campanhas são criadas por pesquisadores (veja o aviso no topo da página).',
        }}
        listar={listar}
        acoes={acoesCompletas}
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Status', ordem: ORDEM_ROTULOS_STATUS_CAMPANHA },
        ]}
      />

      {(criando || (pediuCriar && podeCriar)) && (
        <ModalCriarCampanha auth={auth} aoMudar={recarregar} aoFechar={fecharCriar} />
      )}

      {alterando?.statusOriginal === 'rascunho' && (
        <ModalCriarCampanha auth={auth} idRascunho={alterando.idCampanha} aoMudar={recarregar} aoFechar={fecharAlterando} />
      )}

      {alterando && alterando.statusOriginal !== 'rascunho' && (
        <ModalAlterarCampanha
          auth={auth}
          idCampanha={alterando.idCampanha}
          ehDono
          aoMudar={recarregar}
          aoFechar={fecharAlterando}
        />
      )}

      {consultando && (
        <ModalConsultarCampanha auth={auth} idCampanha={consultando.idCampanha} comoDono aoFechar={fecharConsultando} />
      )}

      {excluindo && (
        <ModalExcluirCampanha
          auth={auth}
          campanha={{ ...excluindo, status: excluindo.statusOriginal }}
          aoExcluida={recarregar}
          aoFechar={fecharExcluindo}
        />
      )}
    </div>
  );
}
