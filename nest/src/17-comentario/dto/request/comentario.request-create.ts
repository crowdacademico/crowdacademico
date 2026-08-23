import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// id_pesquisador NUNCA vem daqui (sempre request.user.idUsuario) — RLS
// (pol_comentario_insert, 04) exige isso, e validar_comentario_autor (05,
// [05-K-3]) já barra o dono da campanha comentar na própria. `endossado`
// opcional: quando TRUE, o service calcula ordem_endosso sozinho (próximo
// número livre pra essa campanha) — nunca vem do cliente, senão dava pra
// forjar a ordem de exibição dos endossos.
export class ComentarioRequestCreate {
  @IsInt()
  idCampanha: number;

  @IsString()
  @MaxLength(500)
  conteudo: string;

  @IsOptional()
  @IsBoolean()
  endossado?: boolean;
}
