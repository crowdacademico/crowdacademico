import { tratarResposta } from '../../../services/constant/api/http.util';
import type { AuthFetch } from '../../../services/3-auth/type/auth.type';
import type { StatusNotificacao } from '../../../services/constant/type/enums-do-banco.gerado';

// Espelha nest/src/30-campo-testes/service/email.service.caixa.ts: a Caixa de E-mails (T6) lista TODOS os e-mails do
// banco desde a última limpeza (na fila, enviados, que falharam, cancelados). Só o "Limpar a caixa" tira alguém da
// lista. Exige notificacao_processar.
export interface EmailDaCaixa {
  idNotificacao: number;
  para: string;
  tipoEvento: string;
  assunto: string;
  status: StatusNotificacao;
  criadoEm: string;
  enviadoEm: string | null;
  provedor: string | null;
}

export interface PreviaDoEmail {
  assunto: string;
  texto: string;
  html: string;
  // true = o que o provedor de teste recebeu; false = montado agora pelos mesmos modelos do envio.
  exato: boolean;
}

export const caixaEmailApi = {
  listar: (authFetch: AuthFetch): Promise<EmailDaCaixa[]> =>
    authFetch('/campo-testes/email').then(tratarResposta<EmailDaCaixa[]>),
  previa: (authFetch: AuthFetch, idNotificacao: number): Promise<PreviaDoEmail> =>
    authFetch(`/campo-testes/email/${idNotificacao}`).then(tratarResposta<PreviaDoEmail>),
  limpar: (authFetch: AuthFetch): Promise<void> =>
    authFetch('/campo-testes/email', { method: 'DELETE' }).then(tratarResposta<void>),
};
