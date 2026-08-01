import { useState } from 'react';

// Widget compacto, embutido no cabeçalho do dashboard — não é mais um
// portão de tela cheia. A tela inteira (tabelas, criar usuário) fica
// visível mesmo sem login: criar o primeiro usuário (POST /usuario) não
// exige sessão nenhuma, então travar tudo atrás de um login era um
// problema do ovo-e-a-galinha (sem usuário, não dava pra logar; sem logar,
// não dava pra criar usuário).
export function LoginForm({ login }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const aoEnviar = async (evento) => {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await login(email, senha);
    } catch (erroRequisicao) {
      setErro(erroRequisicao.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={aoEnviar} className="devtools-login-inline">
      {erro && <span className="devtools-erro">{erro}</span>}
      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
        required
      />
      <input
        type="password"
        placeholder="senha"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
        required
      />
      <button type="submit" disabled={enviando}>
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
