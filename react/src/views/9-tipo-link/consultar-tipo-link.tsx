import { useNavigate, useParams } from 'react-router';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';
import type { PropsPagina } from '../../services/router/pagina.type';

export function ConsultarTipoLink({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { dado: tipo, carregando, erro } = useBuscarPorId(
    (id) => tipoLinkApi.buscar(auth.authFetch, id),
    id,
  );

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!tipo) {
    return <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>;
  }

  // Rótulos dos 3 escopos marcados (CK_TIPO_LINK_ALGUM_ESCOPO garante
  // pelo menos 1) - vira badge por escopo, não um badge Sim/Não por
  // campo: mais rápido de ler "onde isto pode ser usado" de relance.
  const escopos = [
    tipo.permitePerfil && 'Perfil',
    tipo.permiteAtualizacao && 'Atualização',
    tipo.permiteRecompensa && 'Recompensa',
  ].filter((escopo): escopo is string => Boolean(escopo));

  return (
    <FichaConsulta
      titulo={tipo.nome}
      subtitulo={tipo.codigo}
      badges={[
        <BadgeBooleano key="ativo" valor={tipo.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
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
