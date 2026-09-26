import { IsOptional, IsString } from 'class-validator';

// Só `conteudo`: `tipo`/`versao` são imutáveis depois de criada a linha; quem quiser um identificador novo,
// publica uma versão nova (TermoUsoRequestCriar), não altera esta.
export class TermoUsoRequestAlterar {
  @IsOptional()
  @IsString()
  conteudo?: string;
}
