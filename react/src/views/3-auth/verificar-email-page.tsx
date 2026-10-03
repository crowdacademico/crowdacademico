import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { verificarEmail } from '../../services/3-auth/api/auth.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

// Tela que o link de "verificar e-mail" abre: hoje só alcançável pelo alert() de dev em cadastro-page.tsx (o
// token de verdade viria por e-mail, quando 4-mail existir). Sem exigir sessão: o token em si já é a
// autorização (ver auth.controller.verify-email.ts).
export function VerificarEmailPage() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token');
  // Lazy initializer (não setState dentro do efeito) - token ausente já
  // nasce em estado de erro, sem precisar de uma renderização extra pra
  // chegar lá.
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>(() =>
    token ? 'carregando' : 'erro',
  );
  const [mensagemErro, setMensagemErro] = useState(() =>
    token ? '' : 'Link sem token, confira se copiou o endereço completo.',
  );

  // O token só vale uma vez: no desenvolvimento o <StrictMode> roda este efeito duas vezes, e a 2ª chamada
  // recebia "link já usado" (400) e mostrava "Não deu certo" por cima do sucesso da 1ª, com o e-mail já
  // confirmado no banco. O ref (que sobrevive à remontagem do StrictMode) garante uma chamada por token.
  const tokenEnviadoRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || tokenEnviadoRef.current === token) {
      return;
    }
    tokenEnviadoRef.current = token;
    verificarEmail(token)
      .then(() => setEstado('ok'))
      .catch((erroRequisicao) => {
        setEstado('erro');
        setMensagemErro(traduzirErro(erroRequisicao));
      });
  }, [token]);

  return (
    <div className="pagina-centralizada">
      <div className="max-w-(--largura-cartao-solto) w-full fundo-cartao rounded-3xl sombra-cartao-solto border borda-padrao overflow-hidden p-10 text-center">
        {estado === 'carregando' && (
          <>
            <i className="fa-solid fa-spinner fa-spin icone-destaque texto-fraco mb-4" aria-hidden="true"></i>
            <p className="texto-padrao">Confirmando seu e-mail...</p>
          </>
        )}
        {estado === 'ok' && (
          <>
            <div className="w-14 h-14 fundo-sucesso rounded-2xl mx-auto flex items-center justify-center texto-sucesso icone-destaque mb-5">
              <i className="fa-solid fa-check" aria-hidden="true"></i>
            </div>
            <h1 className="titulo-pagina mb-2">E-mail confirmado</h1>
            <p className="paragrafo texto-fraco mb-6">Sua conta já está com o e-mail verificado.</p>
            <Link to="/" className="btn btn-primary inline-block">
              Ir para o painel
            </Link>
          </>
        )}
        {estado === 'erro' && (
          <>
            <div className="w-14 h-14 fundo-erro rounded-2xl mx-auto flex items-center justify-center texto-erro icone-destaque mb-5">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            </div>
            <h1 className="titulo-pagina mb-2">Não deu certo</h1>
            <p className="paragrafo texto-fraco mb-6">{mensagemErro}</p>
            <Link to="/" className="btn btn-secondary inline-block">
              Voltar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
