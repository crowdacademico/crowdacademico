import { IsBoolean, IsString, Matches, MaxLength } from 'class-validator';

// Decidir uma contestação (RF-033): aceitar (a denúncia vira improcedente) ou recusar, sempre com justificativa.
export class DenunciaContestacaoRequestDecide {
  @IsBoolean({ message: 'Escolha aceitar ou recusar.' })
  aceitar: boolean;

  @IsString({ message: 'Escreva a justificativa da decisão.' })
  @Matches(/\S/, { message: 'Escreva a justificativa da decisão.' })
  @MaxLength(5000, {
    message: 'A justificativa pode ter no máximo 5.000 caracteres.',
  })
  justificativa: string;
}
