import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

// Query string sempre chega como string ("?tamanho=20") — @Type(() => Number)
// converte antes do class-validator rodar (precisa de `transform: true` no
// ValidationPipe global, já ligado em main.ts). Os dois campos são
// opcionais: ausentes, `paginar()` (paginacao.util.ts) aplica os padrões de
// segurança dele sozinho.
export class PaginacaoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tamanho?: number;
}
