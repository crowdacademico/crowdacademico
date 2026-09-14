import { IsOptional, IsString } from 'class-validator';

// Só `conteudo` (13-09-2026, achado do Lucas: 2 caixas de texto mostrando a
// mesma versão no modal - o listbox de seleção e um campo "Versão" editável
// - não fazia sentido). `tipo`/`versao` são imutáveis depois de criada a
// linha; quem quiser um identificador novo, publica uma versão nova
// (TermoUsoRequestCriar), não altera esta.
export class TermoUsoRequestAlterar {
  @IsOptional()
  @IsString()
  conteudo?: string;
}
