import { listaCompleta } from '../../constant/util/lista-completa.util';
import type { StatusNotificacao } from '../../constant/type/enums-do-banco.gerado';

// O que pede atenção primeiro (é a ordem do filtro).
export const ORDEM_STATUS_NOTIFICACAO = listaCompleta<StatusNotificacao>()(['falhou', 'pendente', 'enviado', 'cancelado'] as const);

export const ROTULO_STATUS_NOTIFICACAO: Record<StatusNotificacao, string> = {
  falhou: 'Falhou',
  pendente: 'Na fila',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

// Falhou pede uma pessoa (reenviar ou cancelar); na fila é o caminho normal até o envio rodar; enviado é sucesso.
export const CLASSE_BADGE_STATUS_NOTIFICACAO: Record<StatusNotificacao, string> = {
  falhou: 'badge-aviso',
  pendente: 'badge-neutro',
  enviado: 'badge-sucesso',
  cancelado: 'badge-concluido',
};

// Espelha nest/src/27-notificacao/constants/notificacao.constants.ts (TIPO_NOTIFICACAO). Tipo fora do dicionário (um
// seed antigo, por exemplo) aparece como veio: nunca quebra, só fica menos bonito.
const ROTULO_TIPO_NOTIFICACAO: Partial<Record<string, string>> = {
  verificacao_email: 'Confirmar o e-mail',
  recuperacao_senha: 'Criar nova senha',
  campanha_aprovada: 'Campanha aprovada',
  campanha_rejeitada: 'Campanha rejeitada',
  nova_campanha_pesquisador: 'Campanha nova de quem a pessoa segue',
  nova_atualizacao: 'Atualização de campanha seguida',
  campanha_sucesso: 'Campanha apoiada bateu a meta',
  campanha_nao_atingida: 'Campanha apoiada não bateu a meta',
  campanha_encerrada_moderacao: 'Campanha apoiada encerrada pela moderação',
  devolucao_concluida: 'Devolução concluída',
  repasse_previsto: 'Repasse programado',
  encerramento_aprovado: 'Encerramento antecipado aprovado',
  encerramento_rejeitado: 'Encerramento antecipado rejeitado',
  pesquisador_suspenso: 'Pesquisador suspenso',
  pesquisador_reativado: 'Pesquisador reativado',
  contestacao_aceita: 'Contestação aceita',
  contestacao_recusada: 'Contestação recusada',
};

export const rotuloTipoNotificacao = (tipo: string): string => ROTULO_TIPO_NOTIFICACAO[tipo] ?? tipo;

// Provedor que enviou: 'seed' são os e-mails da demonstração, marcados como enviados quando o banco foi montado.
const ROTULO_PROVEDOR: Partial<Record<string, string>> = {
  fake: 'Provedor de teste',
  brevo: 'Brevo',
  smtp: 'SMTP',
  seed: 'Demonstração (seed)',
};

export const rotuloProvedorEmail = (provedor: string | null): string =>
  provedor === null ? '-' : (ROTULO_PROVEDOR[provedor] ?? provedor);
