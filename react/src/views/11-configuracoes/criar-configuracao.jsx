import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';

// Antes era um formulário embutido no fim da tabela de Configurações
// (GenericTable). Virou view própria (pedido do Lucas, 02-08-2026),
// seguindo o mesmo padrão de views/1-usuario/criar-usuario.jsx.
export function CriarConfiguracao({ auth }) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [chave, setChave] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);

  const aoCriar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const configuracaoCriada = await configuracaoApi.criar(auth.authFetch, {
        chave,
        valor,
        tipo,
        descricao,
      });
      mostrar(
        'Configuração cadastrada com sucesso.',
        `A nova configuração possui o ID: ${configuracaoCriada.idConfig}`,
      );
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
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
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Criar Configuração</h2>
          <p className="text-sm text-slate-600 font-medium">
            Preencha os dados abaixo para cadastrar uma nova configuração.
          </p>
        </div>

        <form onSubmit={aoCriar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Chave
            </label>
            <input
              type="text"
              value={chave}
              onChange={(evento) => setChave(evento.target.value)}
              required
              className="input-padrao"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
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
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
              required
              className="input-padrao"
            >
              <option value="" disabled>
                Selecione...
              </option>
              <option value="decimal">Decimal</option>
              <option value="inteiro">Inteiro</option>
              <option value="texto">Texto</option>
              <option value="booleano">Booleano</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              className="input-padrao"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" disabled={enviando} className="btn btn-primary flex-1">
              {enviando ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
