import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Campo } from '../../components/input/campo';
import { MedidorSenha } from '../../components/input/medidor-senha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { redefinirSenha } from '../../services/3-auth/api/auth.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';

// "Esqueci minha senha", passo 2: a tela que o link abre (/redefinir-senha?token=...). Sem exigir sessão: o token
// é a autorização. Depois de trocar, a conta sai de todos os aparelhos (o banco encerra as sessões), então a
// pessoa entra de novo com a senha nova.
export function RedefinirSenhaPage() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token');
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado: salvando, executar } = useEnvio(reportarErro, limparErro);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const senhasIguais = senha === confirmar;

  // Mesma regra de senha do Cadastro (pelo menos 8 caracteres).
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    senha: senha.length < 8 && 'A senha precisa ter pelo menos 8 caracteres.',
    confirmar: !senhasIguais && 'As senhas não são iguais.',
  }));

  const aoSalvar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!token || !tentarEnviar()) return;
    void executar(async () => {
      await redefinirSenha(token, senha);
      setConcluido(true);
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
            <i className="fa-solid fa-lock"></i>
          </div>
          <h1 className="text-3xl font-serif font-bold texto-forte mb-2">Criar nova senha</h1>
          <p className="text-sm texto-fraco font-medium">Escolha uma senha nova para a sua conta.</p>
        </div>

        {!token ? (
          <div className="p-10 space-y-4 text-center">
            <p className="text-sm texto-erro font-semibold">Link sem token, confira se copiou o endereço completo.</p>
            <Link to="/esqueci-senha" className="texto-marca font-bold underline text-sm">
              Pedir um link novo
            </Link>
          </div>
        ) : concluido ? (
          <div className="p-10 space-y-5 text-center">
            <i className="fa-solid fa-circle-check text-4xl texto-sucesso"></i>
            <p className="text-sm texto-padrao">
              Senha alterada. Por segurança, sua conta foi desconectada de todos os aparelhos.
            </p>
            <Link to="/login" className="btn btn-primary w-full py-3.5 text-sm">
              Entrar com a senha nova
            </Link>
          </div>
        ) : (
          <form onSubmit={aoSalvar} noValidate className="p-10 space-y-5">
            <MensagemErro texto={erro} />
            {erro && (
              <Link to="/esqueci-senha" className="texto-marca font-bold underline text-sm">
                Pedir um link novo
              </Link>
            )}
            <Campo rotulo="Nova senha" erro={erroDe('senha')}>
              {({ atributos, classeErro }) => (
                <>
                  <div className="relative">
                    <input
                      {...atributos}
                      type={mostrarSenha ? 'text' : 'password'}
                      value={senha}
                      onChange={(evento) => setSenha(evento.target.value)}
                      className={'input-padrao pr-10' + classeErro}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((atual) => !atual)}
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 texto-fraco hover-texto-forte"
                    >
                      <i className={'fa-solid ' + (mostrarSenha ? 'fa-eye-slash' : 'fa-eye')}></i>
                    </button>
                  </div>
                  <MedidorSenha senha={senha} />
                </>
              )}
            </Campo>
            <Campo
              rotulo="Confirmar nova senha"
              erro={erroDe('confirmar') ?? (confirmar.length > 0 && !senhasIguais && 'As senhas não são iguais.')}
            >
              {({ atributos, classeErro }) => (
                <input
                  {...atributos}
                  type={mostrarSenha ? 'text' : 'password'}
                  value={confirmar}
                  onChange={(evento) => setConfirmar(evento.target.value)}
                  className={'input-padrao' + classeErro}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              )}
            </Campo>
            <button type="submit" disabled={salvando} className="btn btn-primary w-full py-3.5 text-sm">
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
