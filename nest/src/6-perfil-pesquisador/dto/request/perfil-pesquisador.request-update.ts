import { IsEnum, IsString, MinLength, ValidateIf } from 'class-validator';
import { TIPOS_VINCULO } from '../../../commons/database/db.types';
import type { TipoVinculo } from '../../../commons/database/db.types';

const TITULOS_ACADEMICOS_VALIDOS = [
  'graduado',
  'especialista',
  'mestre',
  'doutor',
] as const;

// Nunca inclui `cpf` de propósito - cpf_criptografado/cpf_hash saíram do
// GRANT UPDATE direto (06_grants.sql, 22-08-2026): correção de CPF é só via
// corrigir_cpf_pesquisador() (SECURITY DEFINER), gateada por
// perfil_pesquisador_corrigir_cpf, pensada pra suporte/admin, não pro
// próprio pesquisador (RF-017). Se um dia existir uma rota de correção de
// CPF, é um DTO/endpoint separado, nunca este.
export class PerfilPesquisadorRequestUpdate {
  @IsEnum(TIPOS_VINCULO, {
    message: `tipoVinculo precisa ser um de: ${TIPOS_VINCULO.join(', ')}.`,
  })
  tipoVinculo: TipoVinculo;

  @ValidateIf(
    (dto: PerfilPesquisadorRequestUpdate) =>
      dto.tipoVinculo === 'institucional',
  )
  @IsString()
  @MinLength(2, {
    message: 'Nome da instituição precisa ter pelo menos 2 caracteres.',
  })
  vinculoInstitucional?: string;

  @IsEnum(TITULOS_ACADEMICOS_VALIDOS, {
    message: `tituloAcademico precisa ser um de: ${TITULOS_ACADEMICOS_VALIDOS.join(', ')}.`,
  })
  tituloAcademico: (typeof TITULOS_ACADEMICOS_VALIDOS)[number];
}
