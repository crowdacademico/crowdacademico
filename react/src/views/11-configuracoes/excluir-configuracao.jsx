import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';

export function ExcluirConfiguracao({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [configuracao, setConfiguracao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    configuracaoApi
      .buscar(auth.authFetch, id)
      .then(setConfiguracao)
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoConfirmar = async () => {
    limparErro();
    setExcluindo(true);
    try {
      await configuracaoApi.remover(auth.authFetch, id);
      mostrar('Configuração excluída com sucesso.', `ID: ${id} foi excluída`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      setExcluindo(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-triangle-exclamation"
      titulo="Excluir Configuração"
      subtitulo="Esta ação não pode ser desfeita."
      variante="perigo"
    >
      {carregando ? (
        <p className="p-10 text-center text-sm text-slate-600">Carregando...</p>
      ) : !configuracao ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <div className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <CampoSomenteLeitura rotulo="Chave" valor={configuracao.chave} />
            <CampoSomenteLeitura rotulo="Valor" valor={configuracao.valor} />
            <CampoSomenteLeitura rotulo="Tipo" valor={configuracao.tipo} />
            <CampoSomenteLeitura rotulo="Ativo" valor={configuracao.ativo ? 'Sim' : 'Não'} />
            <CampoSomenteLeitura rotulo="Descrição" valor={configuracao.descricao} />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={aoConfirmar}
              disabled={excluindo}
              className="btn btn-danger flex-1"
            >
              {excluindo ? 'Excluindo...' : 'Confirmar exclusão'}
            </button>
          </div>
        </div>
      )}
    </CartaoFormulario>
  );
}
