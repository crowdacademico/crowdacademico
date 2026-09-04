import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  ROTULO_STATUS_CAMPANHA,
  classeBadgeStatusCampanha,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';

function formatarReais(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : 'Não definida';
}

export function ConsultarCampanha({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campanha, setCampanha] = useState(null);
  const [nomeDono, setNomeDono] = useState(null);
  const [nomeArea, setNomeArea] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast();

  useEffect(() => {
    campanhaApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setCampanha(dados);
        // Nome de dono/área resolvidos à parte (não vêm no
        // CampanhaResponse, só os ids) - mesmo raciocínio de junção
        // client-side de listar-campanhas.jsx, só que aqui é 1 registro
        // de cada em vez do catálogo inteiro.
        usuarioApi.buscar(auth.authFetch, dados.idUsuario).then((u) => setNomeDono(u.nome)).catch(() => {});
        areaConhecimentoApi.buscar(auth.authFetch, dados.idAreaConhecimento).then((a) => setNomeArea(a.nome)).catch(() => {});
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!campanha) {
    return <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={campanha.titulo}
      subtitulo={nomeDono ? `Pesquisador: ${nomeDono}` : undefined}
      largura="larga"
      badges={[
        <span key="status" className={`badge ${classeBadgeStatusCampanha(campanha.status)}`}>
          {ROTULO_STATUS_CAMPANHA[campanha.status] ?? campanha.status}
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
            <CampoFicha rotulo="Início" valor={formatarData(campanha.dataInicio)} />
            <CampoFicha rotulo="Fim (previsto)" valor={formatarData(campanha.dataFim)} />
            <CampoFicha rotulo="Criada em" valor={formatarData(campanha.criadoEm)} />
            <CampoFicha rotulo="Aprovada em" valor={formatarData(campanha.aprovadoEm)} />
            <CampoFicha rotulo="Encerrada em" valor={formatarData(campanha.encerradoEm)} />
          </SecaoFicha>
        </div>

        <div className="space-y-6">
          <SecaoFicha titulo="Financeiro">
            <CampoFicha rotulo="Meta" valor={formatarReais(campanha.metaFinanceira)} />
            <CampoFicha rotulo="Arrecadado" valor={formatarReais(campanha.valorBrutoArrecadado)} />
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
