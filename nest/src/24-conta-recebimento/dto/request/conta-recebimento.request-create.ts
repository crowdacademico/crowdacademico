import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  TIPOS_CHAVE_PIX,
  type TipoChavePix,
} from '../../../commons/database/db.types';

// id_usuario NUNCA vem daqui (sempre do token). A titularidade NÃO é informada: é conferida no provedor.
export class ContaRecebimentoRequestCreate {
  @IsIn(TIPOS_CHAVE_PIX)
  tipoChave: TipoChavePix;

  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  chave: string;
}
