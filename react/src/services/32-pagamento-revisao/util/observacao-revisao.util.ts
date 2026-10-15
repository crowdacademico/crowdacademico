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

// Valor devolvido no reembolso manual: em reais, de 0,01 até o valor da contribuição, com no máximo 2 casas (o banco
// confere de novo, erro 90035). Lê o texto do campo, não um número: `type="number"` devolve sempre ponto como separador.
export function erroValorDevolvido(texto: string, valorContribuicao: number): string | false {
  const limpo = texto.trim();
  if (limpo === '') {
    return 'Informe o valor que foi devolvido.';
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) {
    return 'Use um valor em reais com no máximo 2 casas decimais (ex.: 47.50).';
  }
  const valor = Number(limpo);
  if (valor <= 0) {
    return 'O valor devolvido deve ser maior que zero.';
  }
  return valor > valorContribuicao && 'O valor devolvido não pode passar do valor da contribuição.';
}
