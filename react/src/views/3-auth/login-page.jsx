import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useErroToast } from '../../components/layout/use-erro-toast';

// Cópia fiel de telas/login/login.html do Projeto de Interface real —
// com uma mudança deliberada em relação ao original, não só estética:
//
// O original tem um botão único "Entrar / Criar Conta" + checkbox de
// Termos de Uso, pensado como login/cadastro combinado. Esta tela NÃO
// coleta nome (só e-mail/senha) — e nosso backend exige nome pra criar
// conta (POST /usuario). Botão "Entrar / Criar Conta" aqui mentiria sobre
// o que ele faz de verdade (só loga, nunca cria conta). Por isso o botão
// virou só "Entrar", e o checkbox de Termos saiu — cadastro continua pelo
// bloco "Usuários" do painel admin (que pede nome) até essa tela ganhar um
// campo de nome de verdade. "Esqueceu a senha?" e o login social com
// Google continuam só alert() de protótipo, como no original.
export function LoginPage({ auth }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast();

  const aoEntrar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await auth.login(email, senha);
      navigate('/');
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-surface">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-10 text-center border-b border-slate-100 relative overflow-hidden bg-slate-50">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg relative z-10">
            <i className="fa-solid fa-flask"></i>
          </div>
          <h2 className="text-3xl font-serif font-bold text-dark mb-2 relative z-10">Bem-vindo(a)</h2>
          <p className="text-sm text-slate-600 font-medium relative z-10">
            Acesse sua conta para apoiar a ciência brasileira.
          </p>
        </div>

        <form onSubmit={aoEntrar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Seu E-mail
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
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">
                Sua Senha
              </label>
              <button
                type="button"
                onClick={() => window.alert('Recuperação de senha simulada no protótipo.')}
                className="text-xs text-primary font-bold hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
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
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t-2 border-slate-100"></div>
            <span className="flex-shrink-0 mx-4 text-slate-300 text-[10px] font-black uppercase tracking-widest">
              Ou acesse com
            </span>
            <div className="flex-grow border-t-2 border-slate-100"></div>
          </div>

          <button
            type="button"
            onClick={() => window.alert('Login social com Google simulado no protótipo.')}
            className="w-full border-2 border-slate-200 text-dark font-bold py-3.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-3 text-sm"
          >
            <i className="fa-brands fa-google text-red-500 text-lg"></i> Google
          </button>
        </form>
      </div>
    </div>
  );
}
