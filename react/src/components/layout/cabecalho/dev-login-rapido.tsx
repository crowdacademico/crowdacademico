import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useErroToast } from '../toast/use-erro-toast';
import type { UseAuthReturn } from '../../../services/3-auth/hook/use-auth';

// <dev>: login instantâneo com uma conta que JÁ existe no seed (07_seed_dados.sql, [07-D-1]), sem digitar nada.
// Não cria conta nem senha nova, só reaproveita a senha de dev que é a mesma para os usuários seedados. Clique
// no rótulo: entra como Admin direto (o atalho mais usado). Seta: abre a lista com os outros 6 papéis, na mesma
// ordem de poder do seed (07_seed_dados.sql [07-B-1], id_papel 1=admin...7=usuario), um e-mail seedado por
// papel, escolhido direto de usuario_papel ([07-D-2]).
//
// A lista vive só aqui, autocontida: este componente é uma ferramenta independente do Campo de Testes (troca de
// conta ÚNICA da sessão real do painel).
interface ContaDev {
  rotulo: string;
  email: string;
  senha: string;
}

const CONTAS_DEV: ContaDev[] = [
  { rotulo: 'Admin', email: 'admin@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Moderador', email: 'diego.martins@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Revisor', email: 'camila.nunes@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Suporte', email: 'larissa.pinto@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Curador', email: 'thiago.almeida@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Pesquisador', email: 'ana.santos@usp.br', senha: 'DevTcc123!' },
  { rotulo: 'Usuário comum', email: 'fernanda.souza@gmail.com', senha: 'DevTcc123!' },
];

interface DevLoginRapidoProps {
  auth: Pick<UseAuthReturn, 'login'>;
}

export function DevLoginRapido({ auth }: DevLoginRapidoProps) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast();

  // O erro não é engolido em silêncio: um atalho de dev que esconde o erro parece só "travado" (ex.: o limite
  // de 5 login/60s por IP, auth.module.ts, estoura ao testar 6+ contas do dropdown rápido). Não trava a tela
  // (sem alert/modal), só mostra o texto do erro embaixo do botão (+ o toast, ver use-erro-toast).
  const entrarComo = async (conta: ContaDev) => {
    setMenuAberto(false);
    setEntrando(true);
    limparErro();
    try {
      await auth.login(conta.email, conta.senha);
      void navigate('/');
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div
      // Só `relative`, para o dropdown/erro internos (absolute right-0) continuarem ancorados neste componente:
      // quem posiciona para a direita é o wrapper absoluto em header.tsx (um `ml-20` aqui empurraria o grupo
      // inteiro do cabeçalho).
      className="relative"
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) {
          setMenuAberto(false);
        }
      }}
    >
      <div className="flex">
        <button
          type="button"
          onClick={() => entrarComo(CONTAS_DEV[0])}
          disabled={entrando}
          className="btn-dev"
        >
          &lt;dev&gt; {entrando ? 'Entrando...' : 'Entrar como Admin'}
        </button>
        <button
          type="button"
          onClick={() => setMenuAberto((atual) => !atual)}
          aria-label="Mais contas de desenvolvimento"
          className="btn-dev btn-dev--seta"
        >
          <i className="fa-solid fa-chevron-down"></i>
        </button>
      </div>

      {menuAberto && (
        <div className="absolute right-0 mt-1 w-56 fundo-cartao border-2 border-dashed borda-dev rounded-lg shadow-lg z-50 overflow-hidden">
          {CONTAS_DEV.map((conta) => (
            <button
              key={conta.email}
              type="button"
              onClick={() => entrarComo(conta)}
              className="w-full text-left px-3 py-2 text-sm hover-fundo-dev-sutil"
            >
              {conta.rotulo}
              <span className="block texto-fraco text-xs">{conta.email}</span>
            </button>
          ))}
        </div>
      )}

      {erro && (
        <div className="absolute right-0 mt-1 w-56 bg-red-50 border border-red-200 texto-erro text-xs rounded-lg shadow-lg z-50 px-3 py-2">
          {erro}
        </div>
      )}
    </div>
  );
}
