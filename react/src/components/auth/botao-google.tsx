import { useEffect, useRef, useState } from 'react';

// Login com Google (18-11-2026): o botão OFICIAL do Google Identity Services, sem redirecionamento. O Google abre a
// própria janela, a pessoa escolhe a conta e o botão entrega o ID token ("credential") a `aoReceberToken`; quem confere
// o token é o Nest (POST /auth/google). Sem VITE_GOOGLE_CLIENT_ID o botão não existe: nada de botão falso.
const ID_CLIENTE = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
export const LOGIN_GOOGLE_DISPONIVEL = ID_CLIENTE !== '';

const URL_SCRIPT = 'https://accounts.google.com/gsi/client';

// Só o pedaço da biblioteca do Google que o botão usa.
interface RespostaGoogle {
  credential: string;
}
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (opcoes: {
        client_id: string;
        callback: (resposta: RespostaGoogle) => void;
        ux_mode: 'popup';
        auto_select: boolean;
        cancel_on_tap_outside: boolean;
        context: 'signin' | 'signup';
      }) => void;
      renderButton: (
        elemento: HTMLElement,
        opcoes: {
          type: 'standard';
          theme: 'outline' | 'filled_black';
          size: 'large';
          text: 'continue_with' | 'signup_with';
          shape: 'pill';
          logo_alignment: 'center';
          width: number;
          locale: 'pt-BR';
        },
      ) => void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

// O script é baixado uma vez por página, por quem pedir primeiro.
let carregando: Promise<GoogleIdentity> | null = null;
function carregarGoogle(): Promise<GoogleIdentity> {
  if (window.google) return Promise.resolve(window.google);
  carregando ??= new Promise<GoogleIdentity>((resolver, rejeitar) => {
    const script = document.createElement('script');
    script.src = URL_SCRIPT;
    script.async = true;
    script.onload = () => (window.google ? resolver(window.google) : rejeitar(new Error('Google Identity Services ausente')));
    script.onerror = () => {
      carregando = null;
      rejeitar(new Error('Não foi possível carregar o login com Google.'));
    };
    document.head.appendChild(script);
  });
  return carregando;
}

// O botão do Google não lê o tema da página: escolhe o claro ou o escuro conforme o tema efetivo (data-tema-efetivo em
// <html>, ver controle-tema.tsx) e se redesenha quando ele muda.
function temaEscuro(): boolean {
  return document.documentElement.dataset.temaEfetivo === 'escuro';
}

interface BotaoGoogleProps {
  // 'signup' no cadastro ("Inscrever-se com o Google"), 'signin' no login ("Continuar com o Google").
  contexto: 'signin' | 'signup';
  aoReceberToken: (credential: string) => void;
  aoFalhar: (erro: unknown) => void;
}

export function BotaoGoogle({ contexto, aoReceberToken, aoFalhar }: BotaoGoogleProps) {
  const lugar = useRef<HTMLDivElement>(null);
  const [escuro, setEscuro] = useState(temaEscuro);
  // O callback do Google é registrado uma vez; a ref deixa ele chamar sempre a versão mais nova das props.
  const props = useRef({ aoReceberToken, aoFalhar });
  useEffect(() => {
    props.current = { aoReceberToken, aoFalhar };
  });

  useEffect(() => {
    const observador = new MutationObserver(() => setEscuro(temaEscuro()));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema-efetivo'] });
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    let ativo = true;
    carregarGoogle()
      .then((google) => {
        const elemento = lugar.current;
        if (!ativo || !elemento) return;
        google.accounts.id.initialize({
          client_id: ID_CLIENTE,
          callback: (resposta) => props.current.aoReceberToken(resposta.credential),
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          context: contexto,
        });
        elemento.replaceChildren();
        google.accounts.id.renderButton(elemento, {
          type: 'standard',
          theme: escuro ? 'filled_black' : 'outline',
          size: 'large',
          text: contexto === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          // O Google aceita de 200 a 400 px.
          width: Math.max(200, Math.min(400, Math.round(elemento.getBoundingClientRect().width))),
          locale: 'pt-BR',
        });
      })
      .catch((erro: unknown) => {
        if (ativo) props.current.aoFalhar(erro);
      });
    return () => {
      ativo = false;
    };
  }, [contexto, escuro]);

  // A altura do botão grande do Google (44 px) fica reservada, para a tela não pular quando ele aparece.
  return <div ref={lugar} className="botao-google flex justify-center min-h-11 w-full" data-testid="botao-google" />;
}
