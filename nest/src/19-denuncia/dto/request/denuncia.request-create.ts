import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// Denúncia contra uma campanha (RF-110) ou contra o perfil de um pesquisador (RF-030): exatamente um alvo
// (CK_DENUNCIA_ALVO_XOR, 01). O resto é do banco: campanha ativa, perfil de pesquisador, nunca a si mesmo
// (trg_denuncia_valida_alvo), motivo do tipo certo, uma por alvo e o limite por janela de tempo (05).
export class DenunciaRequestCreate {
  @ValidateIf(
    (dto: DenunciaRequestCreate) =>
      dto.idPesquisadorAlvo == null && dto.idComentario == null,
  )
  @Type(() => Number)
  @IsInt({ message: 'Escolha a campanha ou o perfil denunciado.' })
  idCampanhaAlvo?: number;

  @ValidateIf(
    (dto: DenunciaRequestCreate) =>
      dto.idCampanhaAlvo == null && dto.idComentario == null,
  )
  @Type(() => Number)
  @IsInt({ message: 'Escolha a campanha ou o perfil denunciado.' })
  idPesquisadorAlvo?: number;

  // Denúncia de comentário: só o id do comentário; o banco preenche o alvo (o autor) e guarda a cópia
  // (fn_denuncia_comentario_preenche, 05). Se o dono da campanha denuncia, o comentário sai do ar na hora.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Comentário inválido.' })
  idComentario?: number;

  @Type(() => Number)
  @IsInt({ message: 'Escolha o motivo da denúncia.' })
  idMotivo: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000, {
    message: 'Os detalhes adicionais podem ter no máximo 5.000 caracteres.',
  })
  relato?: string;
}
