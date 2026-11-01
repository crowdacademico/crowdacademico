import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// O admin muda o texto e liga/desliga o canal. Evento e canal não mudam (são o contrato com os gatilhos de [05-Q]).
export class ModeloMensagemRequestUpdate {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'O título não pode ficar vazio.' })
  @MaxLength(200, { message: 'O título vai até 200 caracteres.' })
  titulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'O texto não pode ficar vazio.' })
  @MaxLength(5000, { message: 'O texto vai até 5.000 caracteres.' })
  corpo?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
