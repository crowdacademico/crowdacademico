import { useState } from 'react';

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
    <form onSubmit={aoEnviar} className="devtools-login">
      <h1>CrowdAcadêmico — devtools</h1>
      <p>
        Ferramenta interna só pra testar CRUD + RLS (usuário, papel/permissão,
        configurações). Não é a tela de admin de verdade.
      </p>
      {erro && <p className="devtools-erro">{erro}</p>}
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
