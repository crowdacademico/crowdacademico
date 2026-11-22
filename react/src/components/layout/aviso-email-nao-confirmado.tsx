import { useState } from 'react';
import { Link } from 'react-router';
import * as authApi from '../../services/3-auth/api/auth.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { useErroToast } from './toast/use-erro-toast';
import { useToast } from './toast/use-toast';

interface AvisoEmailNaoConfirmadoProps {
  auth: UseAuthReturn;
}

// Bloqueio parcial do e-mail não confirmado (22-11-2026): quem não confirmou entra e navega, mas não pede o perfil de
// pesquisador, não envia campanha para análise e não comenta (o Nest recusa, ver email-confirmado.util.ts). Este aviso
// fica abaixo do cabeçalho, em toda página, até a confirmação: reenviar o link ali mesmo resolve quem perdeu o e-mail,
// sem precisar do Suporte, e "corrigir o e-mail" leva a Minha Conta para quem digitou errado no cadastro.
export function AvisoEmailNaoConfirmado({ auth }: AvisoEmailNaoConfirmadoProps) {
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  if (!auth.usuario || auth.usuario.emailVerificado) return null;

  const reenviar = async () => {
    setEnviando(true);
    try {
      await authApi.reenviarMinhaVerificacao(auth.authFetch);
      setEnviado(true);
      mostrar('Enviamos outro link de confirmação.');
    } catch (erro) {
      reportarErro(erro);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div role="status" className="fundo-aviso border-b borda-aviso">
      <p className="paragrafo largura-site py-2 flex flex-wrap items-center gap-x-3 gap-y-1 texto-aviso">
        <i className="fa-solid fa-envelope" aria-hidden="true" />
        <span>
          Confirme o seu e-mail (<strong>{auth.usuario.email}</strong>) para comentar, ser pesquisador e enviar campanhas.
        </span>
        {enviado ? (
          <span className="enfase">Link reenviado.</span>
        ) : (
          <button type="button" className="link-texto enfase" onClick={() => void reenviar()} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Reenviar o link'}
          </button>
        )}
        <Link to="/minha-conta" className="link-texto">
          Corrigir o e-mail
        </Link>
      </p>
    </div>
  );
}
