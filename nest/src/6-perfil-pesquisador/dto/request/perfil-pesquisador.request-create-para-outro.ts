import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsCpf } from '../../../commons/seguranca/cpf-valido.decorator';
import { TIPOS_VINCULO } from '../../../commons/database/db.types';
import type { TipoVinculo } from '../../../commons/database/db.types';

const TITULOS_ACADEMICOS_VALIDOS = [
  'graduado',
  'especialista',
  'mestre',
  'doutor',
] as const;

// Separado de PerfilPesquisadorRequestCreate: as duas classes têm os MESMOS 4 campos, mas são ações diferentes
// (admin criando perfil PARA OUTRA pessoa, via criar_perfil_pesquisador_para_outro()).
export class PerfilPesquisadorRequestCreateParaOutro {
  @IsString()
  @IsCpf()
  cpf: string;

  @IsEnum(TIPOS_VINCULO, {
    message: `tipoVinculo precisa ser um de: ${TIPOS_VINCULO.join(', ')}.`,
  })
  tipoVinculo: TipoVinculo;

  @ValidateIf(
    (dto: PerfilPesquisadorRequestCreateParaOutro) =>
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

  // OPCIONAL, diferente de PerfilPesquisadorRequestCreate: o cadeado em T1 mostra o Termo de Uso vigente ANTES
  // do formulário para QUALQUER conta, inclusive a de outra pessoa (o aceite fica registrado em nome do ALVO,
  // não de quem preencheu). Fica opcional (não `@Equals(true)` como no self-service) para não quebrar o card
  // "Criar Perfil Pesquisador" que já existe dentro de ModalAlterarUsuario: esse caminho continua sem passar
  // este campo, então continua sem gravar aceite nenhum (ver comentário em
  // PerfilPesquisadorServiceCreateParaOutro).
  @IsOptional()
  @IsBoolean()
  aceiteTermos?: boolean;
}
