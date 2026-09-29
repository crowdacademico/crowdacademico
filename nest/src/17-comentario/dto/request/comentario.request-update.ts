import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// `ativo` incluso pro autor conseguir ocultar o próprio comentário (ou
// moderador com comentario_moderar ocultar/reverter qualquer um) -
// fn_bloqueia_reversao_moderacao_comentario (05, [05-K-3]) barra o autor
// de reverter uma ocultação feita pela moderação, sem precisar de nada
// extra aqui: a trigger já resolve isso no banco.
export class ComentarioRequestUpdate {
  @IsOptional()
  @IsString()
  @Matches(/\S/, {
    message: 'Escreva o comentário (não pode ficar em branco).',
  })
  @MaxLength(500, {
    message: 'O comentário pode ter no máximo 500 caracteres.',
  })
  conteudo?: string;

  @IsOptional()
  @IsBoolean()
  endossado?: boolean;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
