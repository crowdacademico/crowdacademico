import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Só `nome` — nunca `codigo` (a coluna estável que as triggers de RBAC
// leem, ver papel.codigo em 01_extensoes_enums_tabelas.sql [01-B]). Não
// existe campo `codigo` aqui de propósito: mesmo que alguém tentasse
// mandar no corpo da requisição, o `whitelist: true` do ValidationPipe
// global (main.ts) descarta qualquer campo que não esteja neste DTO antes
// de chegar no service.
export class PapelRequestUpdate {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50) // bate com papel.nome VARCHAR(50), 01_extensoes_enums_tabelas.sql
  nome: string;
}
