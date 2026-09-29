import { BadRequestException, ValidationError } from '@nestjs/common';

// Mensagem padrão do class-validator (em inglês) virando português, só quando o DTO não escreveu a própria: a
// regra que o DTO escreveu fica como está. Os números e a lista de valores vêm da própria mensagem em inglês. O
// campo aparece pelo nome técnico entre aspas (é o que o DTO conhece); a tela mostra o erro embaixo do campo.
const EM_INGLES = /\b(must|should|is expected|has to)\b/;
function emPortugues(regra: string, mensagem: string, campo: string): string {
  if (!EM_INGLES.test(mensagem)) {
    return mensagem;
  }
  const numero = /(\d+)/.exec(mensagem)?.[1] ?? '';
  const valores = /following values: (.+)$/.exec(mensagem)?.[1] ?? '';
  const c = `O campo "${campo}"`;
  const traducoes: Record<string, string> = {
    whitelistValidation: `${c} não é aceito aqui.`,
    isString: `${c} precisa ser um texto.`,
    isInt: `${c} precisa ser um número inteiro.`,
    isNumber: `${c} precisa ser um número.`,
    isPositive: `${c} precisa ser maior que zero.`,
    isNotEmpty: `${c} é obrigatório.`,
    isDefined: `${c} é obrigatório.`,
    maxLength: `${c} pode ter no máximo ${numero} caracteres.`,
    minLength: `${c} precisa ter pelo menos ${numero} caracteres.`,
    min: `${c} precisa ser no mínimo ${numero}.`,
    max: `${c} pode ser no máximo ${numero}.`,
    isDateString: `${c} precisa ser uma data válida.`,
    isIso8601: `${c} precisa ser uma data válida.`,
    isBoolean: `${c} precisa ser verdadeiro ou falso.`,
    isIn: `${c} precisa ser um destes valores: ${valores}.`,
    isEnum: `${c} precisa ser um destes valores: ${valores}.`,
    isUrl: `${c} precisa ser uma URL válida.`,
    isEmail: 'E-mail inválido.',
    isArray: `${c} precisa ser uma lista.`,
  };
  return traducoes[regra] ?? `${c} está com um valor inválido.`;
}

// Erro 400 do ValidationPipe (main.ts, `exceptionFactory`) com as mensagens separadas por campo, além da lista
// de sempre em `message` (compatível com quem já lia a lista). Mesmo formato `campos` do 409 de duplicidade
// (postgres-exception.filter.ts): { <campo do corpo>: [mensagens] }, para o formulário mostrar cada erro
// embaixo do campo certo. Campo aninhado (objeto dentro do DTO) vira caminho com ponto: "endereco.cep".
export function errosPorCampo(
  erros: ValidationError[],
  prefixo = '',
): Record<string, string[]> {
  const campos: Record<string, string[]> = {};
  for (const erro of erros) {
    const caminho = prefixo ? `${prefixo}.${erro.property}` : erro.property;
    const mensagens = Object.entries(erro.constraints ?? {}).map(
      ([regra, mensagem]) => emPortugues(regra, mensagem, erro.property),
    );
    if (mensagens.length > 0) {
      campos[caminho] = mensagens;
    }
    Object.assign(campos, errosPorCampo(erro.children ?? [], caminho));
  }
  return campos;
}

// 400 de uma regra conferida no service, no mesmo formato do ValidationPipe: o formulário mostra a mensagem
// embaixo do campo certo.
export function erroNoCampo(
  campo: string,
  mensagem: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: [mensagem],
    campos: { [campo]: [mensagem] },
  });
}

export function excecaoDeValidacao(
  erros: ValidationError[],
): BadRequestException {
  const campos = errosPorCampo(erros);
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: Object.values(campos).flat(),
    campos,
  });
}
