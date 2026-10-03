import { IsString, Matches, MaxLength } from 'class-validator';

// Encerrar a campanha por moderação a partir de uma denúncia procedente (RF-114): a justificativa é obrigatória e
// vai para a denúncia e para o log de auditoria (RF-115).
export class DenunciaRequestCloseCampaign {
  @IsString({ message: 'Escreva por que a campanha está sendo encerrada.' })
  @Matches(/\S/, {
    message: 'Escreva por que a campanha está sendo encerrada.',
  })
  @MaxLength(5000, {
    message: 'A justificativa pode ter no máximo 5.000 caracteres.',
  })
  justificativa: string;
}
