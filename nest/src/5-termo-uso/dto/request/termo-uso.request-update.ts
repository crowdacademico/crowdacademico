import { IsOptional, IsString } from 'class-validator';

// Só `conteudo`: `tipo`/`versao` são imutáveis depois de criada a linha; quem quiser um identificador novo,
// publica uma versão nova (TermoUsoRequestCreate), não altera esta.
export class TermoUsoRequestUpdate {
  @IsOptional()
  @IsString()
  conteudo?: string;
}
