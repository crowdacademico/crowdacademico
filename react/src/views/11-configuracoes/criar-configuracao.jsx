import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
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
    <CartaoFormulario
      icone="fa-gear"
      titulo="Criar Configuração"
      subtitulo="Preencha os dados abaixo para cadastrar uma nova configuração."
    >
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
    </CartaoFormulario>
  );
}
