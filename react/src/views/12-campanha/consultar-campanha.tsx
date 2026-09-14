import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  ROTULO_STATUS_CAMPANHA,
  classeBadgeStatusCampanha,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';
import { formatarDataHora, formatarMoeda } from '../../services/constant/utils/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { HistoricoRejeicaoResponse } from '../../services/12-campanha/type/campanha.type';

export function ConsultarCampanha({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { dado: campanha, carregando, erro } = useBuscarPorId(
    (id) => campanhaApi.buscar(auth.authFetch, id),
    id,
  );
  const [nomeDono, setNomeDono] = useState<string | null>(null);
  const [nomeArea, setNomeArea] = useState<string | null>(null);
  const [historicoRejeicao, setHistoricoRejeicao] = useState<HistoricoRejeicaoResponse[]>([]);

  // Nome de dono/área resolvidos à parte (não vêm no CampanhaResponse, só
  // os ids) - mesmo raciocínio de junção client-side de listar-campanhas.tsx,
  // só que aqui é 1 registro de cada em vez do catálogo inteiro. Histórico
  // de rejeições (14-09-2026) busca junto, mesma lógica - "onde fica
  // registrado" o motivo, pedido do Lucas.
  useEffect(() => {
    if (campanha) {
      usuarioApi.buscar(auth.authFetch, campanha.idUsuario).then((u) => setNomeDono(u.nome)).catch(() => {});
      areaConhecimentoApi.buscar(auth.authFetch, campanha.idAreaConhecimento).then((a) => setNomeArea(a.nome)).catch(() => {});
      campanhaApi
        .listarHistoricoRejeicao(auth.authFetch, campanha.idCampanha)
        .then(setHistoricoRejeicao)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campanha]);

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!campanha) {
    return <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={campanha.titulo}
      subtitulo={nomeDono ? `Pesquisador: ${nomeDono}` : undefined}
      largura="larga"
      badges={[
        <span key="status" className={`badge ${classeBadgeStatusCampanha(campanha.status)}`}>
          {ROTULO_STATUS_CAMPANHA[campanha.status]}
        </span>,
        <span key="modelo" className="badge badge-neutro">
          {campanha.modelo}
        </span>,
      ]}
      acoes={
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Voltar
        </button>
      }
    >
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <SecaoFicha titulo="Dados">
            <CampoFicha rotulo="id" valor={campanha.idCampanha} />
            <CampoFicha rotulo="Área do conhecimento" valor={nomeArea ?? `#${campanha.idAreaConhecimento}`} />
            <CampoFicha rotulo="Descrição" valor={campanha.descricao} largura="cheia" />
            <CampoFicha rotulo="Vídeo de apresentação" valor={campanha.videoApresentacaoUrl} largura="cheia" />
          </SecaoFicha>

          <SecaoFicha titulo="Datas">
            <CampoFicha rotulo="Início" valor={formatarDataHora(campanha.dataInicio)} />
            <CampoFicha rotulo="Fim (previsto)" valor={formatarDataHora(campanha.dataFim)} />
            <CampoFicha rotulo="Criada em" valor={formatarDataHora(campanha.criadoEm)} />
            <CampoFicha rotulo="Aprovada em" valor={formatarDataHora(campanha.aprovadoEm)} />
            <CampoFicha rotulo="Encerrada em" valor={formatarDataHora(campanha.encerradoEm)} />
          </SecaoFicha>

          {/* Escondida quando vazia de propósito (14-09-2026) - diferente de
              "Termos de Uso Aceitos" (modal-usuario.tsx), que é universal a
              todo usuário. Rejeição é minoria: a maioria das campanhas
              nunca passou por isso, mostrar "nenhuma" sempre seria ruído. */}
          {historicoRejeicao.length > 0 && (
            <SecaoFicha titulo="Histórico de Rejeições">
              {historicoRejeicao.map((item) => (
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
            <CampoFicha rotulo="Meta" valor={formatarMoeda(campanha.metaFinanceira)} />
            <CampoFicha rotulo="Arrecadado" valor={formatarMoeda(campanha.valorBrutoArrecadado)} />
            <CampoFicha
              rotulo="Taxa da plataforma"
              valor={campanha.taxaPlataforma === null ? 'Ainda não carimbada (não aprovada)' : `${campanha.taxaPlataforma}%`}
            />
          </SecaoFicha>
        </div>
      </div>
    </FichaConsulta>
  );
}
