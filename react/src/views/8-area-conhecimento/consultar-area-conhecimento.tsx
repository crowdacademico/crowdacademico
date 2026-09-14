import { useNavigate, useParams } from 'react-router';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';
import type { PropsPagina } from '../../services/router/pagina.type';

export function ConsultarAreaConhecimento({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { dado: area, carregando, erro } = useBuscarPorId(
    (id) => areaConhecimentoApi.buscar(auth.authFetch, id),
    id,
  );

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!area) {
    return <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={area.nome}
      subtitulo={area.codigoCnpq}
      badges={[
        <BadgeBooleano key="ativo" valor={area.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
        // Nível deduzido de idPai, não de um campo próprio - igual o
        // resto da UI (idPai null = grande área raiz, ver comentário no
        // response DTO do backend).
        <span key="nivel" className="badge badge-neutro">
          {area.idPai ? 'Área (nível 2)' : 'Grande área (raiz)'}
        </span>,
      ]}
      acoes={
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Voltar
        </button>
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={area.idAreaConhecimento} />
        <CampoFicha rotulo="Código CNPq" valor={area.codigoCnpq} />
        <CampoFicha rotulo="Nome" valor={area.nome} largura="cheia" />
        <CampoFicha rotulo="Grande área (pai)" valor={area.nomePai} largura="cheia" />
      </SecaoFicha>
    </FichaConsulta>
  );
}
