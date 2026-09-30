import type { TipoTermo } from '../../../commons/database/db.types';

// Diferente de TermoUsoResponseActive (que só existe pro caso de uso público
// de Cadastro) - este é o formato completo, pra tela de administração
// listar TODAS as versões (ativa e histórico), não só a ativa.
export class TermoUsoResponse {
  idTermo: number;
  tipo: TipoTermo;
  versao: string;
  conteudo: string;
  ativo: boolean;
  criadoEm: Date;
  // Só na listagem: quantos aceites a versão tem (RF-091). Versão aceita não se altera nem se exclui, e a tela
  // apaga essas ações em vez de deixar clicar e receber a recusa.
  aceites?: number;
}
