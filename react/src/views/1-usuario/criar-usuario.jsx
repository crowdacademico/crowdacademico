import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

// Primeira de um padrão que vai se repetir: view própria por operação
// (criar/alterar/consultar/excluir), não formulário embutido dentro da
// listagem — mesmo padrão do modelo de referência (hotel: Criar.tsx/
// Alterar.tsx/Consultar.tsx/Excluir.tsx, um arquivo por operação). Alterar/
// consultar/excluir de usuário continuam por enquanto na tabela da listagem
// (views/1-usuario/listar-usuarios.jsx) — só "criar" virou view própria
// nesta rodada; o resto vem depois, seguindo o mesmo modelo.
export function CriarUsuario({ auth }) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const aoCriar = async (evento) => {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const usuarioCriado = await usuarioApi.criar(auth.authFetch, { nome, email, senha });
      mostrar(
        'Usuário cadastrado com sucesso.',
        `O novo usuário possui o ID: ${usuarioCriado.idUsuario}`,
      );
      navigate('/');
    } catch (erroRequisicao) {
      setErro(traduzirErro(erroRequisicao));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 bg-slate-50">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-user-plus"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2">Criar Usuário</h2>
          <p className="text-sm text-slate-500 font-medium">
            Preencha os dados abaixo para cadastrar um novo usuário.
          </p>
        </div>

        <form onSubmit={aoCriar} className="p-10 space-y-6">
          {erro && <p className="text-red-600 text-sm font-bold text-center">{erro}</p>}

          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              required
              className="input-padrao"
              placeholder="Nome completo"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              required
              className="input-padrao"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              required
              className="input-padrao"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-dark hover:bg-black text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg hover:shadow-xl mt-4 disabled:opacity-60"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </form>
      </div>
    </div>
  );
}
