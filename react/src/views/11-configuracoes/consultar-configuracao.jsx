import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoTextboxConsulta } from '../../components/crud/campo-textbox-consulta';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

// "Consultar" — botão do meio entre Alterar e Excluir (GenericTable).
// idUsuario fica vazio naturalmente quando é NULL (configuração global).
export function ConsultarConfiguracao({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [configuracao, setConfiguracao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    configuracaoApi
      .buscar(auth.authFetch, id)
      .then(setConfiguracao)
      .catch((erroRequisicao) => setErro(traduzirErro(erroRequisicao)))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-gear"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Consultar Configuração</h2>
        </div>

        {carregando ? (
          <p className="p-10 text-center text-sm text-slate-500">Carregando...</p>
        ) : !configuracao ? (
          <p className="p-10 text-center text-red-600 text-sm font-bold">{erro}</p>
        ) : (
          <div className="p-10 space-y-6">
            <CampoTextboxConsulta rotulo="id" valor={configuracao.idConfig} />
            <CampoTextboxConsulta rotulo="Id do usuário (vazio = global)" valor={configuracao.idUsuario} />
            <CampoTextboxConsulta rotulo="Chave" valor={configuracao.chave} />
            <CampoTextboxConsulta rotulo="Valor" valor={configuracao.valor} />
            <CampoTextboxConsulta rotulo="Tipo" valor={configuracao.tipo} />
            <CampoTextboxConsulta rotulo="Descrição" valor={configuracao.descricao} />
            <CampoTextboxConsulta rotulo="Ativo" valor={configuracao.ativo ? 'Sim' : 'Não'} />

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary w-full"
            >
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
