import type {
  ModeloCampanha,
  StatusCampanha,
} from '../../../commons/database/db.types';

export class CampanhaResponse {
  idCampanha: number;
  idUsuario: number;
  idAdmin: number | null;
  idAreaConhecimento: number;
  titulo: string;
  modelo: ModeloCampanha;
  metaFinanceira: number;
  valorBrutoArrecadado: number;
  taxaPlataforma: number | null;
  descricao: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: StatusCampanha;
  aprovadoEm: Date | null;
  // Última entrada na fila de aprovação (preenchida pelo banco); a fila mostra "esperando há X dias" a partir dela.
  enviadoAprovacaoEm: Date | null;
  encerradoEm: Date | null;
  videoApresentacaoUrl: string | null;
  criadoEm: Date;
  // Só preenchidos por GET /campanha/:id, e só para campanha 'rejeitado'
  // (ciclo de rejeição e reenvio, ver REQUISITOS_V7). A tela e o e-mail de
  // rejeição precisam desses números, e calculá-los no cliente duplicaria a
  // regra. Nas demais respostas ficam null/false.
  nomePesquisador: string | null;
  nomeArea: string | null;
  // Sinal para o admin na fila de aprovação; null fora dela ou para quem não aprova.
  precisaRevisaoScore: boolean | null;
  reenviosRestantes: number | null;
  prazoReenvioAte: Date | null;
  somenteLeitura: boolean;
  // Campos que o banco não deixa mudar agora (fn_campanha_campos_bloqueados), com os nomes deste DTO. Só vem em
  // GET /campanha/:id; nas demais respostas fica vazio.
  camposBloqueados: string[];
  // RF-087: o que o pesquisador receberia hoje (o arrecadado menos a taxa, nunca menos que taxa_minima_repasse) e a
  // taxa usada (a carimbada na aprovação, ou a padrão antes dela). Só em GET /campanha/:id; nas demais, null.
  valorLiquidoEstimado: number | null;
  taxaAplicada: number | null;
  // Nome de quem aprovou (campanha.id_admin, carimbado na aprovação). Só em GET /campanha/:id e só para quem pode
  // aprovar campanha: o dono e, no futuro, a página pública não veem qual pessoa da equipe aprovou. Senão, null.
  nomeAprovador: string | null;
  // Quem encerrou: o nome de quem mudou a campanha para a situação final, ou "Sistema" quando foi uma tarefa automática
  // (o fim do prazo). Vem do log de auditoria, que guarda toda mudança de situação com quem fez (os 4 caminhos de
  // encerramento gravam em lugares diferentes, o log é o único comum). Mesma restrição de nomeAprovador; null também
  // quando o registro já saiu do log (retenção) ou a conta foi excluída.
  nomeEncerrador: string | null;
}
