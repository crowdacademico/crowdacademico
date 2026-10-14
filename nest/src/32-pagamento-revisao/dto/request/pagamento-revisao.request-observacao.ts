import { IsString, MaxLength, MinLength } from 'class-validator';

// Toda ação do painel exige dizer o que foi feito (fica na auditoria, com quem fez). A API não decide por você: o texto
// é o rastro de uma decisão que aconteceu FORA do sistema (devolver no painel do provedor, corrigir uma chave, etc.).
export class PagamentoRevisaoRequestObservacao {
  @IsString({ message: 'A observação precisa ser um texto.' })
  @MinLength(3, {
    message: 'Escreva o que foi feito (pelo menos 3 caracteres).',
  })
  @MaxLength(1000, {
    message: 'A observação pode ter no máximo 1.000 caracteres.',
  })
  observacao: string;
}
