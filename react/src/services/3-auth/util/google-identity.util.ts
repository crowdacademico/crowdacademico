// O Google Identity Services (18-11-2026): o ID do cliente, o carregamento do script e o logout. Fica fora de
// botao-google.tsx porque arquivo de componente só exporta componente (Fast Refresh do Vite).
// Sem VITE_GOOGLE_CLIENT_ID o botão não existe: nada de botão falso.
export const ID_CLIENTE = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
export const LOGIN_GOOGLE_DISPONIVEL = ID_CLIENTE !== '';

const URL_SCRIPT = 'https://accounts.google.com/gsi/client';

// Só o pedaço da biblioteca do Google que o botão usa.
export interface RespostaGoogle {
  credential: string;
}
export interface GoogleIdentity {
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
      disableAutoSelect: () => void;
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
export function carregarGoogle(): Promise<GoogleIdentity> {
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

// Logout (18-11-2026): avisa o Google para nunca escolher a conta sozinho na próxima vez, a recomendação do próprio
// Google para quem sai. O botão ainda pode mostrar "Continuar como <nome>" (quem desenha é o Google, enquanto o navegador
// estiver logado na conta Google), mas só entra com um clique. O CrowdAcadêmico não guarda conta nem senha do Google; num
// computador compartilhado, quem sai precisa sair também do Google, como em qualquer site com login do Google.
export function esquecerEscolhaGoogle(): void {
  window.google?.accounts.id.disableAutoSelect();
}

