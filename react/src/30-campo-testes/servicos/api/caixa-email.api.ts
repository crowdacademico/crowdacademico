import { tratarResposta } from '../../../services/constant/api/http.util';
import type { AuthFetch } from '../../../services/3-auth/type/auth.type';

// Espelha nest/src/30-campo-testes/controllers/email.controller.caixa.ts: a caixa de entrada do provedor de e-mail de
// teste (o que o sistema "enviou" sem mandar nada para fora). Exige notificacao_processar. Some ao reiniciar o Nest.
export interface EmailCapturado {
  idMensagem: string;
  para: string;
  nomePara?: string;
  assunto: string;
  texto: string;
  html: string;
  enviadoEm: string;
}

export const caixaEmailApi = {
  listar: (authFetch: AuthFetch): Promise<EmailCapturado[]> =>
    authFetch('/campo-testes/email').then(tratarResposta<EmailCapturado[]>),
  limpar: (authFetch: AuthFetch): Promise<void> =>
    authFetch('/campo-testes/email', { method: 'DELETE' }).then(tratarResposta<void>),
};
