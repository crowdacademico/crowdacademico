import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  TAMANHO_MAXIMO_BYTES_ABSOLUTO,
  TIPOS_MIME_PERMITIDOS,
} from '../../arquivo.constants';

export class ArquivoRequestIniciarUpload {
  // Só pra guardar em arquivo.nome_original e (se for PDF) montar o
  // Content-Disposition - NUNCA usado pra decidir a chave do objeto no
  // bucket (isso é sempre randomUUID, gerado no service). Se o front
  // pudesse mandar o nome/tamanho do arquivo de verdade, a validação toda
  // vira decoração.
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nomeOriginal: string;

  @IsString()
  @IsIn(TIPOS_MIME_PERMITIDOS, {
    message: `tipoMime precisa ser um dos formatos aceitos: ${TIPOS_MIME_PERMITIDOS.join(
      ', ',
    )}. SVG nunca é aceito (pode conter script embutido - ver arquivo.constants.ts).`,
  })
  tipoMime: (typeof TIPOS_MIME_PERMITIDOS)[number];

  // Teto de FORMA aqui (o maior entre os 4 tipos) - o teto de negócio de
  // verdade, por tipo, é conferido em
  // arquivo.service.iniciar-upload.ts.executar().
  @IsInt()
  @Min(1)
  @Max(TAMANHO_MAXIMO_BYTES_ABSOLUTO)
  tamanhoBytes: number;
}
