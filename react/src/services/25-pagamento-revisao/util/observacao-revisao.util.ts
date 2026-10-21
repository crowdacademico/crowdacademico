import { contarCaracteres } from '../../constant/util/validacao.util';
import { OBSERVACAO_REVISAO_LIMITE, OBSERVACAO_REVISAO_MINIMO } from '../constants/pagamento-revisao.constants';

// Mesma conferência do DTO do Nest (3 a 1.000 caracteres, sem contar espaços nas pontas), para o erro aparecer
// embaixo do campo antes de pedir a confirmação. Devolve a mensagem, ou `false` quando está certo (formato que
// `useErrosFormulario` espera).
export function erroObservacaoRevisao(observacao: string): string | false {
  if (observacao.trim().length < OBSERVACAO_REVISAO_MINIMO) {
    return `Escreva o que foi feito (pelo menos ${OBSERVACAO_REVISAO_MINIMO} caracteres).`;
  }
  return contarCaracteres(observacao) > OBSERVACAO_REVISAO_LIMITE && `A observação passou do limite de ${OBSERVACAO_REVISAO_LIMITE.toLocaleString('pt-BR')} caracteres.`;
}
