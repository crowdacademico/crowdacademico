import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { ROTULO_TIPO_MOTIVO_DENUNCIA as ROTULO_TIPO } from '../../services/10-motivo-denuncia/constants/motivo-denuncia.constants';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { MotivoDenunciaResponse } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

export function ConsultarMotivoDenuncia({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [motivo, setMotivo] = useState<MotivoDenunciaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast();

  useEffect(() => {
    motivoDenunciaApi
      .buscar(auth.authFetch, id)
      .then(setMotivo)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!motivo) {
    return <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={motivo.descricao}
      badges={[
        <span
          key="ativo"
          className={'badge ' + (motivo.ativo ? 'badge-sucesso' : 'badge-neutro')}
        >
          {motivo.ativo ? 'Ativo' : 'Inativo'}
        </span>,
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
