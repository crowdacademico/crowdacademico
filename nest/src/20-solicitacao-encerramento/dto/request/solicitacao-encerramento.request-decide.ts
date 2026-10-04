import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// Aprovar ou rejeitar um pedido (RF-065): rejeitar exige justificativa; aprovar aceita uma, opcional.
export class SolicitacaoEncerramentoRequestDecide {
  @IsBoolean({ message: 'Escolha aprovar ou rejeitar.' })
  aprovar: boolean;

  @ValidateIf((dto: SolicitacaoEncerramentoRequestDecide) => !dto.aprovar)
  @IsString({ message: 'Escreva por que o pedido foi rejeitado.' })
  @Matches(/\S/, { message: 'Escreva por que o pedido foi rejeitado.' })
  @MaxLength(10000, {
    message: 'A justificativa pode ter no máximo 10.000 caracteres.',
  })
  @IsOptional()
  justificativa?: string;
}
