import { useNavigate, useParams } from 'react-router';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { ROTULO_TIPO_MOTIVO_DENUNCIA as ROTULO_TIPO } from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';
import type { PropsPagina } from '../../services/router/pagina.type';

export function ConsultarMotivoDenuncia({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { dado: motivo, carregando, erro } = useBuscarPorId(
    (id) => motivoDenunciaApi.buscar(auth.authFetch, id),
    id,
  );

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!motivo) {
    return <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={motivo.descricao}
      badges={[
        <BadgeBooleano key="ativo" valor={motivo.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
        <span key="tipo" className="badge badge-neutro">
          {ROTULO_TIPO[motivo.tipo]}
        </span>,
      ]}
      acoes={
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Voltar
        </button>
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={motivo.idMotivo} />
        <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO[motivo.tipo]} />
        <CampoFicha rotulo="Descrição" valor={motivo.descricao} largura="cheia" />
      </SecaoFicha>
    </FichaConsulta>
  );
}
