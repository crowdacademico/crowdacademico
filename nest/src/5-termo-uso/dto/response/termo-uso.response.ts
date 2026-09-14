import type { TipoTermo } from '../../../commons/database/db.types';

// Diferente de TermoUsoResponseAtivo (que só existe pro caso de uso público
// de Cadastro) - este é o formato completo, pra tela de administração
// listar TODAS as versões (ativa e histórico), não só a ativa.
export class TermoUsoResponse {
  idTermo: number;
  tipo: TipoTermo;
  versao: string;
  conteudo: string;
  ativo: boolean;
  criadoEm: Date;
}
