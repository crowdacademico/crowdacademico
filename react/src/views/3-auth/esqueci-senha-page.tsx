import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link } from 'react-router';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { esqueciSenha } from '../../services/3-auth/api/auth.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { emailValido } from '../../services/constant/util/validacao.util';

// "Esqueci minha senha" (RF-006), passo 1: pede o link. A resposta é sempre a mesma, exista ou não a conta (não
// revela quem tem cadastro, padrão de mercado). Enquanto o módulo de e-mail não existe, o link aparece aqui só em
// desenvolvimento (botão roxo <dev>, como o do Cadastro); em produção ninguém recebe o link ainda.
export function EsqueciSenhaPage() {
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar } = useEnvio(reportarErro, limparErro);
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [tokenDev, setTokenDev] = useState<string | null>(null);

  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    email: email.trim() === '' ? 'Informe seu e-mail.' : !emailValido(email) && 'E-mail inválido.',
  }));

  const aoEnviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!tentarEnviar()) return;
    void executar(async () => {
      const resposta = await esqueciSenha(email.trim());
      setTokenDev(resposta.tokenRecuperacaoSenhaDev);
      setEnviado(true);
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 fundo-pagina">
      <div className="max-w-md w-full fundo-cartao rounded-3xl sombra-cartao-solto border borda-padrao overflow-hidden">
        <div className="p-10 text-center border-b borda-padrao fundo-sutil relative isolate overflow-hidden">
          <div
            className="pointer-events-none absolute -z-10 top-0 left-1/2 -translate-x-1/2 w-32 h-32 brilho-marca rounded-full blur-3xl"
            style={{ '--opacidade-brilho-marca': '20%' } as CSSProperties}
          ></div>
          <div className="w-14 h-14 fundo-marca rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-5 shadow-lg">
            <i className="fa-solid fa-key"></i>
          </div>
          <h1 className="titulo-pagina mb-2">Esqueceu a senha?</h1>
          <p className="paragrafo texto-fraco font-medium">
            Digite o e-mail da sua conta e enviamos um link para você criar uma senha nova.
          </p>
        </div>

        {enviado ? (
          <div className="p-10 space-y-5 text-center">
            <i className="fa-solid fa-envelope-circle-check text-4xl texto-marca"></i>
            <p className="paragrafo texto-padrao">
              Se existir uma conta com <strong>{email.trim()}</strong>, enviamos um link para criar uma senha nova. O
              link vale por pouco tempo e só pode ser usado uma vez.
            </p>
            {tokenDev && (
              <Link to={`/redefinir-senha?token=${tokenDev}`} className="btn-dev">
                &lt;dev&gt; Abrir o link (o e-mail ainda não existe)
              </Link>
            )}
            <p className="legenda texto-fraco">
              Não chegou?{' '}
              <button type="button" onClick={() => setEnviado(false)} className="texto-marca font-bold underline">
                Pedir de novo
              </button>
            </p>
          </div>
        ) : (
          <form onSubmit={aoEnviar} noValidate className="p-10 space-y-5">
            <MensagemErro texto={erro} />
            <Campo rotulo="E-mail" erro={erroDe('email')}>
              {({ atributos, classeErro }) => (
                <input
                  {...atributos}
                  type="email"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  className={'input-padrao' + classeErro}
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
              )}
            </Campo>
            <button type="submit" disabled={enviando} className="btn btn-primary btn-destaque w-full py-3.5">
              {enviando ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}

        <p className="legenda pb-8 texto-fraco text-center">
          Lembrou a senha?{' '}
          <Link to="/login" className="texto-marca font-bold underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
