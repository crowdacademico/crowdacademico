import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';

export function ConsultarTipoLink({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast();

  useEffect(() => {
    tipoLinkApi
      .buscar(auth.authFetch, id)
      .then(setTipo)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!tipo) {
    return <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>;
  }

  // Rótulos dos 3 escopos marcados (CK_TIPO_LINK_ALGUM_ESCOPO garante
  // pelo menos 1) - vira badge por escopo, não um badge Sim/Não por
  // campo: mais rápido de ler "onde isto pode ser usado" de relance.
  const escopos = [
    tipo.permitePerfil && 'Perfil',
    tipo.permiteAtualizacao && 'Atualização',
    tipo.permiteRecompensa && 'Recompensa',
  ].filter(Boolean);

  return (
    <FichaConsulta
      titulo={tipo.nome}
      subtitulo={tipo.codigo}
      badges={[
        <span key="ativo" className={'badge ' + (tipo.ativo ? 'badge-sucesso' : 'badge-neutro')}>
          {tipo.ativo ? 'Ativo' : 'Inativo'}
        </span>,
        ...escopos.map((escopo) => (
          <span key={escopo} className="badge badge-neutro">
            {escopo}
          </span>
        )),
      ]}
      acoes={
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Voltar
        </button>
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={tipo.idTipolink} />
        <CampoFicha rotulo="Código" valor={tipo.codigo} />
        <CampoFicha rotulo="Nome" valor={tipo.nome} largura="cheia" />
        <CampoFicha
          rotulo="Domínios permitidos"
          valor={tipo.dominio.length ? tipo.dominio.join(', ') : null}
          largura="cheia"
        />
        <CampoFicha rotulo="Regex de validação" valor={tipo.regex} largura="cheia" />
      </SecaoFicha>
    </FichaConsulta>
  );
}
