import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// O token vem de quem tokenizou o cartão no provedor. NUNCA número, CVV nem validade: o service recusa um "token" que
// pareça número de cartão. id_usuario e provedor também não vêm daqui (token de login e provedor configurado).
export class CartaoTokenizadoRequestCreate {
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  @Matches(/^\S+$/, { message: 'tokenCartao não pode conter espaços.' })
  tokenCartao: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bandeira?: string;

  @Matches(/^\d{4}$/, {
    message: 'ultimosDigitos deve ter exatamente 4 dígitos.',
  })
  ultimosDigitos: string;
}
