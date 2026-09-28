import { IsString, MaxLength, MinLength } from 'class-validator';

export class CampanhaRequestReject {
  // Obrigatória (RF de aprovar/rejeitar campanha: "em caso de rejeição, o preenchimento da justificativa é
  // obrigatório"); a tela já exigia, a API não.
  @IsString({ message: 'A justificativa da rejeição precisa ser um texto.' })
  @MinLength(3, {
    message:
      'A justificativa da rejeição é obrigatória (pelo menos 3 caracteres).',
  })
  @MaxLength(10000, {
    message: 'A justificativa pode ter no máximo 10.000 caracteres.',
  })
  justificativa: string;
}
