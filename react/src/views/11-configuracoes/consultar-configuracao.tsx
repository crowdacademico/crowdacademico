import { useNavigate, useParams } from 'react-router';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { useBuscarPorId } from '../../services/constant/hook/use-buscar-por-id';
import type { PropsPagina } from '../../services/router/pagina.type';

// "Consultar" - botão do meio entre Alterar e Excluir (GenericTable).
// Migrada pro mesmo estilo de FichaConsulta usado em ConsultarUsuario
// (09-08-2026, pedido do Lucas: era a última tela ainda na caixinha
// CampoTextboxConsulta antiga) - mesmo dado de sempre, só o layout mudou.
// idUsuario fica vazio naturalmente quando é NULL (configuração global).
export function ConsultarConfiguracao({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { dado: configuracao, carregando, erro } = useBuscarPorId(
    (id) => configuracaoApi.buscar(auth.authFetch, id),
    id,
  );

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!configuracao) {
    return <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={configuracao.chave}
      subtitulo={configuracao.descricao ?? undefined}
      badges={[
        <BadgeBooleano key="ativo" valor={configuracao.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
        <BadgeBooleano key="publica" valor={configuracao.publica} rotuloTrue="Pública" rotuloFalse="Interna" />,
      ]}
      acoes={
        <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary w-full">
          Voltar
        </button>
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={configuracao.idConfig} />
        <CampoFicha rotulo="Tipo" valor={configuracao.tipo} />
        <CampoFicha
          rotulo="Id do usuário"
          valor={configuracao.idUsuario}
          largura="cheia"
        />
        <CampoFicha rotulo="Valor" valor={configuracao.valor} largura="cheia" />
        <CampoFicha rotulo="Descrição" valor={configuracao.descricao} largura="cheia" />
      </SecaoFicha>
    </FichaConsulta>
  );
}
