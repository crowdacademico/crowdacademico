import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';

export function ConsultarAreaConhecimento({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [area, setArea] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast();

  useEffect(() => {
    areaConhecimentoApi
      .buscar(auth.authFetch, id)
      .then(setArea)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!area) {
    return <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={area.nome}
      subtitulo={area.codigoCnpq}
      badges={[
        <span key="ativo" className={'badge ' + (area.ativo ? 'badge-sucesso' : 'badge-neutro')}>
          {area.ativo ? 'Ativo' : 'Inativo'}
        </span>,
        // Nível deduzido de idPai, não de um campo próprio — igual o
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
