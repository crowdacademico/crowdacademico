import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsCpf } from '../../commons/seguranca/cpf-valido.decorator';
import { TIPOS_VINCULO } from '../../commons/database/db.types';
import type { TipoVinculo } from '../../commons/database/db.types';

const TITULOS_ACADEMICOS_VALIDOS = [
  'graduado',
  'especialista',
  'mestre',
  'doutor',
] as const;

// Separado de PerfilPesquisadorRequestCreate: as duas classes têm os MESMOS 4 campos, mas são ações diferentes
// (admin criando perfil PARA OUTRA pessoa, via criar_perfil_pesquisador_para_outro()).
export class PerfilPesquisadorRequestCreateForOther {
  @IsString()
  @IsCpf()
  cpf: string;

  @IsEnum(TIPOS_VINCULO, {
    message: `tipoVinculo precisa ser um de: ${TIPOS_VINCULO.join(', ')}.`,
  })
  tipoVinculo: TipoVinculo;

  @ValidateIf(
    (dto: PerfilPesquisadorRequestCreateForOther) =>
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

  // O Upgrade do T1 mostra o Termo de Uso vigente ANTES do formulário para QUALQUER conta, inclusive a de outra
  // pessoa, e sempre manda `true` (o aceite fica em nome do ALVO, não de quem preencheu). Opcional aqui, e não
  // `@Equals(true)` como no self-service; o T1 é o único que chama esta rota.
  @IsOptional()
  @IsBoolean()
  aceiteTermos?: boolean;
}
