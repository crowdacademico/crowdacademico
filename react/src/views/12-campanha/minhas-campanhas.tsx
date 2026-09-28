import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { BotaoCriar } from '../../components/crud/botao-criar';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  ORDEM_STATUS_CAMPANHA,
  ROTULO_STATUS_CAMPANHA,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { ModalAlterarCampanha } from './modal-alterar-campanha';
import { ModalConsultarCampanha } from './modal-consultar-campanha';
import { ModalCriarCampanha } from './modal-criar-campanha';
import { ModalExcluirCampanha } from './modal-excluir-campanha';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { StatusPesquisador } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';

interface MinhaCampanhaLinha extends Omit<CampanhaResponse, 'status'> {
  status: string;
  statusOriginal: CampanhaResponse['status'];
}

// Minhas Campanhas: as campanhas do PRÓPRIO usuário logado, em qualquer status (a RLS deixa o dono ver as
// suas). Criar abre o passo a passo (Dados, Orçamento, Cronograma, Enviar); Alterar serve para completar um
// rascunho, ajustar orçamento/cronograma enquanto não foi aprovada, e corrigir e reenviar uma rejeitada; depois
// de aprovada, os campos travados aparecem desabilitados. Excluir só vale para rascunho (o modal explica quando
// não pode).
//
// Criar só aparece para quem tem perfil de pesquisador ATIVO (a mesma condição de pol_campanha_insert, 04):
// para os outros, a tela explica o porquê em vez de oferecer um botão que o banco recusaria.
export function MinhasCampanhas({ auth }: PropsPagina) {
  const idUsuario = auth.usuario?.idUsuario ?? null;
  const [statusPesquisador, setStatusPesquisador] = useState<StatusPesquisador | 'sem-perfil' | null>(null);
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

  useEffect(() => {
    if (idUsuario === null) {
      return;
    }
    perfilPesquisadorApi
      .buscar(auth.authFetch, idUsuario)
      .then((perfil) => setStatusPesquisador(perfil.statusPesquisador))
      .catch(() => setStatusPesquisador('sem-perfil'));
  }, [auth.authFetch, idUsuario]);

  const listar = useCallback(async (): Promise<MinhaCampanhaLinha[]> => {
    if (idUsuario === null) {
      return [];
    }
    const campanhas = await campanhaApi.listar(auth.authFetch, { idUsuario });
    return campanhas.map((campanha) => ({
      ...campanha,
      status: ROTULO_STATUS_CAMPANHA[campanha.status],
      statusOriginal: campanha.status,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idUsuario, chaveRecarga]);

  const podeCriar = statusPesquisador === 'ativo';

  return (
    <div className="admin-content-painel">
      {statusPesquisador !== null && !podeCriar && (
        <div className="flex items-start gap-2 rounded-lg fundo-info texto-info p-3 text-sm mb-6">
          <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
          {statusPesquisador === 'suspenso' ? (
            <p>Seu perfil de pesquisador está suspenso: enquanto durar a suspensão, não é possível criar campanhas.</p>
          ) : (
            <p>
              Só pesquisadores criam campanhas.{' '}
              <Link to="/admin/minha-conta/academico" className="font-bold underline">
                Tornar-me pesquisador
              </Link>{' '}
              (Minha Conta, aba Acadêmico).
            </p>
          )}
        </div>
      )}

      <GenericTable<MinhaCampanhaLinha>
        titulo="Minhas Campanhas"
        acaoTopo={
          podeCriar && (
            <BotaoCriar rotulo="Criar campanha" aoClicar={abrirCriando} />
          )
        }
        colunas={[
          { chave: 'idCampanha', rotulo: 'id', tipo: 'id' },
          { chave: 'titulo', rotulo: 'título', tipo: 'nome' },
          { chave: 'status', rotulo: 'status', tipo: 'status' },
          { chave: 'metaFinanceira', rotulo: 'meta', tipo: 'dinheiro' },
          { chave: 'valorBrutoArrecadado', rotulo: 'arrecadado', tipo: 'dinheiro' },
          { chave: 'dataFim', rotulo: 'termina em', tipo: 'data' },
        ]}
        chavePrimaria="idCampanha"
        listar={listar}
        acoes={acoesCompletas}
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Status', ordem: ORDEM_STATUS_CAMPANHA.map((s) => ROTULO_STATUS_CAMPANHA[s]) },
        ]}
      />

      {criando && <ModalCriarCampanha auth={auth} aoMudar={recarregar} aoFechar={fecharCriando} />}

      {alterando && (
        <ModalAlterarCampanha
          auth={auth}
          idCampanha={alterando.idCampanha}
          aoMudar={recarregar}
          aoFechar={fecharAlterando}
        />
      )}

      {consultando && (
        <ModalConsultarCampanha auth={auth} idCampanha={consultando.idCampanha} aoFechar={fecharConsultando} />
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
