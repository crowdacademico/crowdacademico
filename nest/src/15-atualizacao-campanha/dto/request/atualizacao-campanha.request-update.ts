import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// `ativo`: o dono oculta e mostra de novo a própria atualização; a moderação (atualizacao_moderar) oculta e mostra
// qualquer uma. O que a moderação ocultou o dono não mostra de novo (fn_atualizacao_ocultacao, 05, 92040).
export class AtualizacaoCampanhaRequestUpdate {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  conteudo?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // Obrigatório quando a moderação exclui (ativo = false): o banco recusa sem ele (90044). Fora disso, é ignorado.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivoModeracao?: string;
}
