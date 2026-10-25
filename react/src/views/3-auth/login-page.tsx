import { useId, useState } from 'react';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { IconeGoogle } from '../../components/auth/icone-google';
import { LogoMarca } from '../../components/layout/logo-marca';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { Campo } from '../../components/input/campo';
import { ErroHttp } from '../../services/constant/api/http.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { emailValido } from '../../services/constant/util/validacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';

// Cópia fiel de telas/login/login.html do Projeto de Interface real, com uma mudança deliberada em relação ao
// original, não só estética:
//
// O original tem um botão único "Entrar / Criar Conta" + checkbox do Termo de Uso, pensado como login/cadastro
// combinado. Esta tela NÃO coleta nome (só e-mail/senha): o cadastro público de verdade é /cadastro
// (cadastro-page.tsx), tela própria com nome/confirmação de senha/aceite de termos; o link "Já tem conta?
// Entrar" dela devolve para cá, e o link "Cadastre-se" abaixo leva para lá. O botão é só "Entrar" porque só faz
// login. O login social com Google é só alert() de protótipo, como no original; "Esqueceu a senha?" leva a
// /esqueci-senha.
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
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const idSenha = useId();
  const idErroSenha = useId();
  // Login recusado (e-mail sem conta ou senha errada, a mesma resposta nos dois casos): a frase do servidor fica no
  // topo e os dois campos ficam marcados, cada um com o texto que o servidor mandou em `campos`. Fica no topo mesmo
  // com os campos marcados (useErroToast, sozinho, troca a frase do topo pelos erros de campo).
  const [recusa, setRecusa] = useState('');

  // Mesma validação do cadastro: o erro aparece embaixo do campo, com o cursor nele, e não num aviso solto. O erro do
  // servidor sobre um campo (validação do DTO, login recusado) vai para o mesmo lugar.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    email: email.trim() === '' ? 'Informe o e-mail.' : !emailValido(email) && 'E-mail inválido.',
    senha: senha === '' && 'Informe a senha.',
  }));
  // O texto do servidor vem primeiro e vale até a pessoa mexer no campo (onChange tira): sem isso, a senha apagada
  // depois do login recusado mostraria "Informe a senha." no lugar de "Senha inválida.".
  const erroEmail = errosCampo.email || erroDe('email');
  const erroSenha = errosCampo.senha || erroDe('senha');

  const aoEntrar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!tentarEnviar()) {
      return;
    }
    setRecusa('');
    await executarEnviando(async () => {
      try {
        await auth.login(email, senha);
      } catch (erroLogin) {
        // Como a maioria dos sistemas: o e-mail digitado fica, a senha é apagada para a pessoa digitar de novo.
        if (erroLogin instanceof ErroHttp && erroLogin.campos) {
          setSenha('');
          setRecusa(erroLogin.message);
        }
        throw erroLogin;
      }
      void navigate(destinoDepoisDoLogin(local.state), { replace: true });
    });
  };

  return (
    <div className="pagina-centralizada">
      <div className="max-w-(--largura-cartao-solto) w-full fundo-cartao rounded-3xl sombra-cartao-solto border borda-padrao overflow-hidden">
        <div className="p-10 text-center border-b borda-padrao relative overflow-hidden fundo-sutil">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 brilho-marca brilho-marca-forte rounded-full blur-3xl"
          ></div>
          <LogoMarca className="h-14 mx-auto mb-5 relative z-10" />
          <h1 className="titulo-pagina mb-2 relative z-10">Bem-vindo(a)</h1>
          <p className="paragrafo texto-fraco relative z-10">
            Acesse sua conta para apoiar a ciência brasileira.
          </p>
        </div>

        <form onSubmit={aoEntrar} noValidate className="p-10 space-y-6">
          <MensagemErro texto={erro || recusa} className="paragrafo-destaque texto-erro text-center whitespace-pre-line" />

          <Campo rotulo="Seu E-mail" erro={erroEmail}>
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type="email"
                value={email}
                onChange={(evento) => {
                  setEmail(evento.target.value);
                  limparErroCampo('email');
                }}
                required
                className={'input-padrao' + classeErro}
                placeholder="seu@email.com"
                autoComplete="email"
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
              onChange={(evento) => {
                setSenha(evento.target.value);
                limparErroCampo('senha');
              }}
              required
              aria-invalid={Boolean(erroSenha)}
              aria-describedby={erroSenha ? idErroSenha : undefined}
              className={'input-padrao order-3 w-full' + (erroSenha ? ' borda-erro' : '')}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {erroSenha && (
              <p id={idErroSenha} className="legenda-destaque erro-campo order-4 w-full">
                {erroSenha}
              </p>
            )}
            <Link to="/esqueci-senha" className="legenda-destaque texto-marca hover:underline mb-2 order-2">
              Esqueceu a senha?
            </Link>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="btn btn-primary btn-destaque w-full py-3.5 mt-4"
          >
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t-2 borda-padrao"></div>
            <span className="rotulo-leitura flex-shrink-0 mx-4 texto-fraco">
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
            className="paragrafo-destaque w-full border-2 borda-padrao fundo-cartao texto-forte py-3.5 rounded-xl hover-fundo-sutil transition flex items-center justify-center gap-3"
          >
            <IconeGoogle /> Continuar com Google
          </button>

          {/* Chamada de cadastro: a segunda ação mais importante da tela, por isso tem mais respiro
              acima. Continua sendo link, não um 2º botão cheio (dois botões grandes competiriam entre si). */}
          <p className="paragrafo texto-fraco text-center pt-2">
            Ainda não tem cadastro?{' '}
            <Link to="/cadastro" className="link-texto">
              Clique aqui
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
