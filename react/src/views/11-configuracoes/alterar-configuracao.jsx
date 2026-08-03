import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { useToast } from '../../components/layout/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';

// `chave`/`tipo` não aparecem no formulário (só leitura) porque
// AtualizarConfiguracaoRequestDto (Nest) não os aceita — são imutáveis
// depois de criada a linha, só valor/descricao/ativo podem mudar.
export function AlterarConfiguracao({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [configuracao, setConfiguracao] = useState(null);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    configuracaoApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setConfiguracao(dados);
        setValor(dados.valor ?? '');
        setDescricao(dados.descricao ?? '');
        setAtivo(dados.ativo);
      })
      .catch((erroRequisicao) => setErro(erroRequisicao.message))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await configuracaoApi.atualizar(auth.authFetch, id, { valor, descricao, ativo });
      mostrar('Configuração alterada com sucesso.', `ID: ${id} foi alterada`);
      navigate(-1);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-gear"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Alterar Configuração</h2>
        </div>

        {carregando ? (
          <p className="p-10 text-center text-sm text-slate-500">Carregando...</p>
        ) : !configuracao ? (
          <p className="p-10 text-center text-red-600 text-sm font-bold">{erro}</p>
        ) : (
          <form onSubmit={aoSalvar} className="p-10 space-y-6">
            {erro && <p className="text-red-600 text-sm font-bold text-center">{erro}</p>}

            <CampoSomenteLeitura rotulo="Chave" valor={configuracao.chave} />
            <CampoSomenteLeitura rotulo="Tipo" valor={configuracao.tipo} />

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Valor
              </label>
              <input
                type="text"
                value={valor}
                onChange={(evento) => setValor(evento.target.value)}
                className="input-padrao"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Descrição
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                className="input-padrao"
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(evento) => setAtivo(evento.target.checked)}
              />
              Ativo
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button type="submit" disabled={enviando} className="btn btn-primary flex-1">
                {enviando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
