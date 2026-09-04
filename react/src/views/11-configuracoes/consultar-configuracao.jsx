import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoFicha, FichaConsulta, SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';

// "Consultar" - botão do meio entre Alterar e Excluir (GenericTable).
// Migrada pro mesmo estilo de FichaConsulta usado em ConsultarUsuario
// (09-08-2026, pedido do Lucas: era a última tela ainda na caixinha
// CampoTextboxConsulta antiga) - mesmo dado de sempre, só o layout mudou.
// idUsuario fica vazio naturalmente quando é NULL (configuração global).
export function ConsultarConfiguracao({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [configuracao, setConfiguracao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const { erro, reportarErro } = useErroToast();

  useEffect(() => {
    configuracaoApi
      .buscar(auth.authFetch, id)
      .then(setConfiguracao)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (carregando) {
    return <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>;
  }

  if (!configuracao) {
    return <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>;
  }

  return (
    <FichaConsulta
      titulo={configuracao.chave}
      subtitulo={configuracao.descricao}
      badges={[
        <span
          key="ativo"
          className={'badge ' + (configuracao.ativo ? 'badge-sucesso' : 'badge-neutro')}
        >
          {configuracao.ativo ? 'Ativo' : 'Inativo'}
        </span>,
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
