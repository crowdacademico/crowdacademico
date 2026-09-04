import { IsEnum, IsString, MinLength, ValidateIf } from 'class-validator';
import { IsCpf } from '../../../commons/seguranca/cpf-valido.decorator';
import { TIPOS_VINCULO } from '../../../commons/database/db.types';
import type { TipoVinculo } from '../../../commons/database/db.types';

const TITULOS_ACADEMICOS_VALIDOS = [
  'graduado',
  'especialista',
  'mestre',
  'doutor',
] as const;

// "Tornar-se pesquisador" - usuário já cadastrado (comum, Grupo 1 do
// cadastro) upgrada a própria conta. id_usuario NUNCA vem do corpo da
// requisição (mesmo padrão de 11-configuracoes/configuracao.request-create):
// o controller pega de request.user.idUsuario, senão qualquer um poderia
// criar perfil de pesquisador em nome de outra pessoa (a RLS bloquearia via
// pol_perfil_insert, mas nem deveria chegar nesse ponto).
export class PerfilPesquisadorRequestCreate {
  // CPF em texto puro só nesta borda de entrada - o service cifra e calcula
  // o hash antes de qualquer INSERT, nunca chega perto de INSERT sem passar
  // pelas duas funções de commons/seguranca/cpf-cifra.util.ts. @IsCpf só
  // confere FORMATO (dígito verificador) - ver PENDENCIAS e correcoes.md,
  // item 745, sobre verificação de existência real (fora de escopo agora).
  @IsString()
  @IsCpf()
  cpf: string;

  @IsEnum(TIPOS_VINCULO, {
    message: `tipoVinculo precisa ser um de: ${TIPOS_VINCULO.join(', ')}.`,
  })
  tipoVinculo: TipoVinculo;

  // Espelha CK_PERFIL_VINCULO (01): institucional exige preenchido e
  // não-vazio; independente exige ausente. @ValidateIf evita cravar
  // @IsNotEmpty incondicional (quebraria o caso independente) - a palavra
  // final de qualquer combinação inválida continua sendo a CHECK constraint
  // do banco (o service traduz a violação numa mensagem amigável, mesmo
  // padrão de CODIGO_PG_UNIQUE_VIOLATION em papel-permissao.service.create).
  @ValidateIf(
    (dto: PerfilPesquisadorRequestCreate) =>
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
