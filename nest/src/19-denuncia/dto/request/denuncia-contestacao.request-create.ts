import { IsString, Matches, MaxLength } from 'class-validator';

// Contestação do score (RF-033): o pesquisador penalizado explica por que a denúncia procedente é injusta.
export class DenunciaContestacaoRequestCreate {
  @IsString({ message: 'Escreva por que a penalidade é injusta.' })
  @Matches(/\S/, { message: 'Escreva por que a penalidade é injusta.' })
  @MaxLength(5000, {
    message: 'A contestação pode ter no máximo 5.000 caracteres.',
  })
  texto: string;
}
