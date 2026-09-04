import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useErroToast } from './use-erro-toast';

// <dev> - login instantâneo com uma conta que JÁ existe no seed
// (07_seed_dados.sql, [07-D-1]), sem digitar nada. Existe só porque logar
// como admin toda hora pra testar o painel era chato (pedido do Lucas,
// 03-08-2026) - não cria conta nem senha nova, só reaproveita a senha de
// dev que já é a mesma pros usuários seedados (ver temp_Nest_React.md,
// "Seed tinha senha_hash falso"). Clique no rótulo: entra como Admin
// direto (continua sendo o atalho mais usado). Seta: abre a lista com os
// outros 6 papéis (03-08-2026, pedido do Lucas: "pra eu ir testando") -
// mesma ordem de poder do seed (07_seed_dados.sql [07-B-1], id_papel
// 1=admin...7=usuario), um e-mail seedado por papel, escolhido direto de
// usuario_papel ([07-D-2]).
//
// ERA importado de services/campo-testes/constants/atores-seed.js
// (22-08-2026) - arquivo apagado no dia seguinte (23-08-2026, pedido do
// Lucas: "não faz sentido estes dados falsos... parece que é mais lixo
// que vai sujar o código"). Lista voltou a viver só aqui, autocontida -
// este componente é uma ferramenta independente do Elenco do Campo de
// Testes (troca de conta ÚNICA da sessão real do painel; o Elenco mantém
// VÁRIAS ao mesmo tempo, com identidade dinâmica agora, não uma lista
// fixa).
const CONTAS_DEV = [
  { rotulo: 'Admin', email: 'admin@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Moderador', email: 'diego.martins@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Revisor', email: 'camila.nunes@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Suporte', email: 'larissa.pinto@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Curador', email: 'thiago.almeida@crowdacademico.com.br', senha: 'DevTcc123!' },
  { rotulo: 'Pesquisador', email: 'ana.santos@usp.br', senha: 'DevTcc123!' },
  { rotulo: 'Usuário comum', email: 'fernanda.souza@gmail.com', senha: 'DevTcc123!' },
];

export function DevLoginRapido({ auth }) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast();

  // ACHADO (07-08-2026): erro era engolido em silêncio ("atalho de dev,
  // não vale poluir a tela") - só que isso escondeu um bug real (limite
  // de 5 login/60s por IP, auth.module.ts, estourando ao testar 6+ contas
  // do dropdown rápido) atrás de um botão que parecia só "travado", sem
  // pista nenhuma do motivo. Ainda não trava a tela (sem alert/modal), só
  // mostra o texto do erro embaixo do botão (+ o toast, ver use-erro-toast.js).
  const entrarComo = async (conta) => {
    setMenuAberto(false);
    setEntrando(true);
    limparErro();
    try {
      await auth.login(conta.email, conta.senha);
      navigate('/');
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div
      // ERA "relative ml-20" - o `ml-20` empurrava o grupo inteiro do
      // cabeçalho quando este componente ainda vivia dentro dele
      // (09-08-2026, achado do Lucas: "ícone de login sobrou no meio da
      // tela"). Agora quem posiciona pra direita é o wrapper absoluto em
      // header.jsx - aqui só precisa do `relative`, pro dropdown/erro
      // internos (absolute right-0) continuarem ancorados neste componente.
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
        <div className="absolute right-0 mt-1 w-56 fundo-cartao border-2 border-dashed border-purple-300 rounded-lg shadow-lg z-50 overflow-hidden">
          {CONTAS_DEV.map((conta) => (
            <button
              key={conta.email}
              type="button"
              onClick={() => entrarComo(conta)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50"
            >
              {conta.rotulo}
              <span className="block texto-fraco text-xs">{conta.email}</span>
            </button>
          ))}
        </div>
      )}

      {erro && (
        <div className="absolute right-0 mt-1 w-56 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg shadow-lg z-50 px-3 py-2">
          {erro}
        </div>
      )}
    </div>
  );
}
