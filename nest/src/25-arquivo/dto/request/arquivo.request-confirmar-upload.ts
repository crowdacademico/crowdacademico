import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PASTA_PENDENTE } from '../../../commons/storage/storage.constants';
import {
  CONTEXTOS_ARQUIVO,
  TAMANHO_MAXIMO_BYTES_ABSOLUTO,
  TIPOS_MIME_PERMITIDOS,
} from '../../arquivo.constants';

// Repete nomeOriginal/tipoMime/tamanhoBytes de ArquivoRequestIniciarUpload
// de propósito: o service confere os três contra o que está de verdade no
// bucket (obterInfoObjeto + lerPrimeirosBytes) antes de gravar qualquer
// linha em `arquivo` — nunca confia só no que o corpo desta requisição diz.
export class ArquivoRequestConfirmarUpload {
  @IsString()
  @IsNotEmpty()
  @Matches(new RegExp(`^${PASTA_PENDENTE}`), {
    message:
      'chave precisa ser a de um upload pendente, gerada por ' +
      'POST /arquivo/upload/iniciar — nunca um caminho arbitrário.',
  })
  chave: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nomeOriginal: string;

  @IsString()
  @IsIn(TIPOS_MIME_PERMITIDOS)
  tipoMime: (typeof TIPOS_MIME_PERMITIDOS)[number];

  @IsInt()
  @Min(1)
  @Max(TAMANHO_MAXIMO_BYTES_ABSOLUTO)
  tamanhoBytes: number;

  // Só existe pra ESCOLHER o teto de redimensionamento em confirmar-upload
  // (avatar vs campanha vs atualização) — não é conferido contra nada
  // físico do arquivo (ao contrário de tipo/tamanho), então mentir aqui
  // não é risco de segurança, só faz a imagem sair maior/menor do que o
  // ideal pro seu próprio uso. Lista fechada (ver arquivo.constants.ts) —
  // um contexto novo precisa de decisão de produto (qual teto?), não pode
  // vir solto do cliente.
  @IsString()
  @IsIn(CONTEXTOS_ARQUIVO)
  contexto: (typeof CONTEXTOS_ARQUIVO)[number];
}
