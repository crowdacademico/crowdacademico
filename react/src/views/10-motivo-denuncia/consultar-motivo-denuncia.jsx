import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';

// Rótulo legível pro `tipo` cru ('campanha' | 'perfil') — mesma ideia dos
// badges de escopo em ConsultarTipoLink, só que aqui é um valor único
// (não múltiplos escopos), então vira 1 badge neutro em vez de uma lista.
const ROTULO_TIPO = {
  campanha: 'Campanha',
  perfil: 'Perfil',
};

export function ConsultarMotivoDenuncia({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [motivo, setMotivo] = useState(null);
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
      titulo={motivo.descricao || motivo.codigo}
      subtitulo={motivo.codigo}
      badges={[
        <span
          key="ativo"
          className={'badge ' + (motivo.ativo ? 'badge-sucesso' : 'badge-neutro')}
        >
          {motivo.ativo ? 'Ativo' : 'Inativo'}
        </span>,
        <span key="tipo" className="badge badge-neutro">
          {ROTULO_TIPO[motivo.tipo] ?? motivo.tipo}
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
        <CampoFicha rotulo="Código" valor={motivo.codigo} />
        <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO[motivo.tipo] ?? motivo.tipo} />
        <CampoFicha rotulo="Descrição" valor={motivo.descricao} largura="cheia" />
      </SecaoFicha>
    </FichaConsulta>
  );
}
