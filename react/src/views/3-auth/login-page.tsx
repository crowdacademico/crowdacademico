import { useId, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { IconeGoogle } from '../../components/3-auth/icone-google';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { Campo } from '../../components/input/campo';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { PropsPagina } from '../../services/router/pagina.type';

// Cópia fiel de telas/login/login.html do Projeto de Interface real, com uma mudança deliberada em relação ao
// original, não só estética:
//
// O original tem um botão único "Entrar / Criar Conta" + checkbox do Termo de Uso, pensado como login/cadastro
// combinado. Esta tela NÃO coleta nome (só e-mail/senha): o cadastro público de verdade é /cadastro
// (cadastro-page.tsx), tela própria com nome/confirmação de senha/aceite de termos; o link "Já tem conta?
// Entrar" dela devolve para cá, e o link "Cadastre-se" abaixo leva para lá. O botão é só "Entrar" porque só faz
// login. "Esqueceu a senha?" e o login social com Google são só alert() de protótipo, como no original.
//
// Depois de entrar, volta para a página do painel que a guarda do AdminLayout interceptou (`voltarPara`). Só
// aceita caminho interno de /admin, nunca um endereço de fora, para um link montado não mandar a pessoa para
// outro site depois do login.
function destinoDepoisDoLogin(estado: unknown): string {
  if (typeof estado === 'object' && estado !== null && 'voltarPara' in estado) {
    const { voltarPara } = estado;
    if (typeof voltarPara === 'string' && voltarPara.startsWith('/admin/')) {
      return voltarPara;
    }
  }
  return '/';
}

export function LoginPage({ auth }: PropsPagina) {
  const navigate = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const { erro, reportarErro, limparErro } = useErroToast();
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const idSenha = useId();

  const aoEntrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    await executarEnviando(async () => {
      await auth.login(email, senha);
      void navigate(destinoDepoisDoLogin(local.state), { replace: true });
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 fundo-pagina">
      <div className="max-w-md w-full fundo-cartao rounded-3xl shadow-2xl border borda-padrao overflow-hidden">
        <div className="p-10 text-center border-b borda-padrao relative overflow-hidden fundo-sutil">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 brilho-marca rounded-full blur-3xl"
            style={{ '--opacidade-brilho-marca': '20%' } as CSSProperties}
          ></div>
          <div className="w-14 h-14 fundo-marca rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg relative z-10">
            <i className="fa-solid fa-flask"></i>
          </div>
          <h1 className="text-3xl font-serif font-bold texto-forte mb-2 relative z-10">Bem-vindo(a)</h1>
          <p className="text-sm texto-fraco font-medium relative z-10">
            Acesse sua conta para apoiar a ciência brasileira.
          </p>
        </div>

        <form onSubmit={aoEntrar} className="p-10 space-y-6">
          {erro && (
            <p className="texto-erro text-sm font-bold text-center whitespace-pre-line">
              {erro}
            </p>
          )}

          <Campo rotulo="Seu E-mail">
            {({ atributos }) => (
              <input
                {...atributos}
                type="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                required
                className="input-padrao"
                placeholder="seu@email.com"
              />
            )}
          </Campo>

          {/* Mesmo desenho do protótipo (link à direita do rótulo), mas o campo vem ANTES do link no HTML: com
              Tab, o e-mail vai direto para a senha. `order` recoloca o link no lugar visual de sempre. */}
          <div className="flex flex-wrap justify-between items-center">
            <label htmlFor={idSenha} className="rotulo-campo mb-2 order-1">
              Sua Senha
            </label>
            <input
              id={idSenha}
              type="password"
              value={senha}
              onChange={(evento) => setSenha(evento.target.value)}
              required
              className="input-padrao order-3 w-full"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => window.alert('Recuperação de senha simulada no protótipo.')}
              className="text-xs texto-marca font-bold hover:underline mb-2 order-2"
            >
              Esqueceu a senha?
            </button>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-dark hover:bg-black text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg hover:shadow-xl mt-4 disabled:opacity-60"
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t-2 borda-padrao"></div>
            <span className="flex-shrink-0 mx-4 texto-fraco text-[10px] font-black uppercase tracking-widest">
              Ou acesse com
            </span>
            <div className="flex-grow border-t-2 borda-padrao"></div>
          </div>

          {/* Botão do Google: logo oficial de 4 cores via SVG (icone-google.tsx), texto "Continuar com
              Google" (um `fa-brands fa-google text-red-500` seria um G vermelho chapado, nada parecido com o
              que Google/GitHub/qualquer site usa). Cores do fundo/borda ficam nos tokens de tema
              (fundo-cartao/borda-padrao), não fixas em branco: diferente da diretriz oficial (que é sempre
              branca), mas consistente com o app inteiro reagir ao tema escuro; um botão sempre branco
              destoaria numa tela escura. */}
          <button
            type="button"
            onClick={() => window.alert('Login social com Google simulado no protótipo.')}
            className="w-full border-2 borda-padrao fundo-cartao texto-forte font-bold py-3.5 rounded-xl hover-fundo-sutil transition flex items-center justify-center gap-3 text-sm"
          >
            <IconeGoogle /> Continuar com Google
          </button>

          {/* Chamada de cadastro: a segunda ação mais importante da tela, por isso text-sm e mais respiro
              acima. Continua sendo link, não um 2º botão cheio (dois botões grandes competiriam entre si). */}
          <p className="text-sm texto-fraco text-center pt-2">
            Ainda não tem cadastro?{' '}
            <Link to="/cadastro" className="texto-marca font-bold underline">
              Clique aqui
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
