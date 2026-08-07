import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-red-100 rounded-2xl mx-auto flex items-center justify-center text-red-600 font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Excluir Configuração</h2>
          <p className="text-sm text-slate-600 font-medium">Esta ação não pode ser desfeita.</p>
        </div>

        {carregando ? (
          <p className="p-10 text-center text-sm text-slate-600">Carregando...</p>
        ) : !configuracao ? (
          <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
        ) : (
          <div className="p-10 space-y-6">
            {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

            <CampoSomenteLeitura rotulo="Chave" valor={configuracao.chave} />
            <CampoSomenteLeitura rotulo="Valor" valor={configuracao.valor} />
            <CampoSomenteLeitura rotulo="Tipo" valor={configuracao.tipo} />
            <CampoSomenteLeitura rotulo="Descrição" valor={configuracao.descricao} />
            <CampoSomenteLeitura rotulo="Ativo" valor={configuracao.ativo ? 'Sim' : 'Não'} />

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
      </div>
    </div>
  );
}
