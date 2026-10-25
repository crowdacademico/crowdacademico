import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// `nome` e `descricao` - nunca `codigo` (a coluna estável que as triggers de RBAC
// leem, ver papel.codigo em 01_extensoes_enums_tabelas.sql [01-B]). Não
// existe campo `codigo` aqui de propósito: mesmo que alguém tentasse
// mandar no corpo da requisição, o `whitelist: true` do ValidationPipe
// global (main.ts) descarta qualquer campo que não esteja neste DTO antes
// de chegar no service.
export class PapelRequestUpdate {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50) // bate com papel.nome VARCHAR(50), 01_extensoes_enums_tabelas.sql
  // As telas juntam os papéis de uma conta com vírgula ("admin, pesquisador") e o filtro separa por ela.
  @Matches(/^[^,]+$/, { message: 'O nome do papel não pode ter vírgula.' })
  nome: string;

  // Vazio ou ausente: o papel fica sem descrição.
  @IsOptional()
  @IsString()
  @MaxLength(500) // bate com papel.descricao VARCHAR(500)
  descricao?: string;
}
