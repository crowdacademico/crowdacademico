import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// Login com Google (18-11-2026): o ID token que o botão do Google Identity Services entrega ao React ("credential").
// Nada mais vem do cliente: e-mail, nome e o "sub" saem do token, depois de conferido.
export class AuthRequestGoogle {
  @IsString()
  @MinLength(1, { message: 'Faltou o token do Google.' })
  // Um ID token tem perto de 1 KB; o teto só evita um corpo enorme.
  @MaxLength(8192, { message: 'Token do Google inválido.' })
  credential: string;

  // Prazo de carência (22-11-2026): TRUE quando a pessoa clicou "Reativar minha conta" no modal de exclusão agendada.
  @IsOptional()
  @IsBoolean()
  reativar?: boolean;
}
