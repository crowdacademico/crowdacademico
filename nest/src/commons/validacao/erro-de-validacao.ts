import { BadRequestException, ValidationError } from '@nestjs/common';

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
    const mensagens = Object.values(erro.constraints ?? {});
    if (mensagens.length > 0) {
      campos[caminho] = mensagens;
    }
    Object.assign(campos, errosPorCampo(erro.children ?? [], caminho));
  }
  return campos;
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
