import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { verificarEmail } from '../../services/3-auth/api/auth.api';
import { traduzirErro } from '../../services/constant/api/traduzir-erro.util';

// Tela que o link de "verificar e-mail" abre (09-08-2026, Bloco D) — hoje
// só alcançável pelo alert() de dev em cadastro-page.jsx (o token de
// verdade viria por e-mail, quando 4-mail existir). Sem exigir sessão: o
// token em si já é a autorização (ver auth.controller.verificar-email.ts).
export function VerificarEmailPage() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token');
  // Lazy initializer (não setState dentro do efeito) — token ausente já
  // nasce em estado de erro, sem precisar de uma renderização extra pra
  // chegar lá.
  const [estado, setEstado] = useState(() => (token ? 'carregando' : 'erro')); // carregando | ok | erro
  const [mensagemErro, setMensagemErro] = useState(() =>
    token ? '' : 'Link sem token — confira se copiou o endereço completo.',
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    verificarEmail(token)
      .then(() => setEstado('ok'))
      .catch((erroRequisicao) => {
        setEstado('erro');
        setMensagemErro(traduzirErro(erroRequisicao));
      });
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 fundo-pagina">
      <div className="max-w-md w-full fundo-cartao rounded-3xl shadow-2xl border borda-padrao overflow-hidden p-10 text-center">
        {estado === 'carregando' && (
          <>
            <i className="fa-solid fa-spinner fa-spin text-3xl texto-fraco mb-4"></i>
            <p className="texto-padrao">Confirmando seu e-mail...</p>
          </>
        )}
        {estado === 'ok' && (
          <>
            <div className="w-14 h-14 fundo-sucesso rounded-2xl mx-auto flex items-center justify-center texto-sucesso text-2xl mb-5">
              <i className="fa-solid fa-check"></i>
            </div>
            <h2 className="text-2xl font-serif font-bold texto-forte mb-2">E-mail confirmado</h2>
            <p className="text-sm texto-fraco mb-6">Sua conta já está com o e-mail verificado.</p>
            <Link to="/" className="btn btn-primary inline-block">
              Ir para o painel
            </Link>
          </>
        )}
        {estado === 'erro' && (
          <>
            <div className="w-14 h-14 fundo-erro rounded-2xl mx-auto flex items-center justify-center texto-erro text-2xl mb-5">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2 className="text-2xl font-serif font-bold texto-forte mb-2">Não deu certo</h2>
            <p className="text-sm texto-fraco mb-6">{mensagemErro}</p>
            <Link to="/" className="btn btn-secondary inline-block">
              Voltar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
