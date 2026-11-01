import type { CanalNotificacao } from '../../../commons/database/db.types';

export class ModeloMensagemResponse {
  idModeloMensagem: number;
  tipoEvento: string;
  canal: CanalNotificacao;
  titulo: string;
  corpo: string;
  ativo: boolean;
  obrigatoria: boolean;
  atualizadoEm: Date;
  // Os campos que o texto deste tipo pode usar ({{campo}}).
  campos: readonly string[];
}
