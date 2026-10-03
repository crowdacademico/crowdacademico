import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// Denúncia contra uma campanha (RF-106) ou contra o perfil de um pesquisador (RF-029): exatamente um alvo
// (CK_DENUNCIA_ALVO_XOR, 01). O resto é do banco: campanha ativa, perfil de pesquisador, nunca a si mesmo
// (trg_denuncia_valida_alvo), motivo do tipo certo, uma por alvo e o limite por janela de tempo (05).
export class DenunciaRequestCreate {
  @ValidateIf((dto: DenunciaRequestCreate) => dto.idPesquisadorAlvo == null)
  @Type(() => Number)
  @IsInt({ message: 'Escolha a campanha ou o perfil denunciado.' })
  idCampanhaAlvo?: number;

  @ValidateIf((dto: DenunciaRequestCreate) => dto.idCampanhaAlvo == null)
  @Type(() => Number)
  @IsInt({ message: 'Escolha a campanha ou o perfil denunciado.' })
  idPesquisadorAlvo?: number;

  @Type(() => Number)
  @IsInt({ message: 'Escolha o motivo da denúncia.' })
  idMotivo: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'O relato pode ter no máximo 5.000 caracteres.' })
  relato?: string;
}
