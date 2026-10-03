import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { STATUS_DENUNCIA } from '../../../commons/database/db.types';
import type { StatusDenuncia } from '../../../commons/database/db.types';

// Julgar uma denúncia (RF-111): o status e, ao decidir (procedente ou improcedente), o porquê. Quem denunciou não
// julga a própria denúncia (92006, 05) e a regra de acesso só abre a quem tem denuncia_responder.
export class DenunciaRequestUpdate {
  @IsIn(STATUS_DENUNCIA, { message: 'Escolha a situação da denúncia.' })
  status: StatusDenuncia;

  @ValidateIf(
    (dto: DenunciaRequestUpdate) =>
      dto.status === 'resolvida' || dto.status === 'improcedente',
  )
  @IsString({ message: 'Escreva por que a denúncia foi decidida assim.' })
  @Matches(/\S/, { message: 'Escreva por que a denúncia foi decidida assim.' })
  @MaxLength(5000, {
    message: 'A justificativa pode ter no máximo 5.000 caracteres.',
  })
  @IsOptional()
  justificativa?: string;
}
