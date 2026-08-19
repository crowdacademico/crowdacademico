import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Sem `codigo`, de propósito — mesma razão de `area_conhecimento.
// codigoCnpq`/`papel.codigo`: é a chave estável que
// calcular_score_perfil_academico() (05_regras_negocio.sql [05-I-2]) lê
// pra reconhecer Lattes/ORCID; editável só travaria RBAC/score em
// silêncio se alguém renomeasse por engano. `nome` (rótulo livre) e todo
// o resto podem mudar sem risco nenhum.
export class TipoLinkRequestUpdate {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // regex: NULLABLE — omitido = não muda; `null` explícito = limpa (volta
  // pra "sem regex configurado"); string = novo padrão. `@IsOptional()`
  // do class-validator já trata `null` e `undefined` como "pula os outros
  // validadores" (não precisa de `@ValidateIf` a mais pra isto funcionar).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  regex?: string | null;

  // dominio: NOT NULL DEFAULT '{}' no banco — omitido = não muda; array
  // (inclusive `[]`) = novo valor. Diferente de `regex` acima, não aceita
  // `null` aqui: pra "limpar" (aceitar qualquer domínio de novo), mande
  // array vazio (`[]`), não `null` — a coluna não guarda `null`.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  dominio?: string[];

  // Se qualquer um dos 3 vier no corpo, o service confere o resultado
  // FINAL (combinando com o que já está gravado pros que não vieram)
  // contra CK_TIPO_LINK_ALGUM_ESCOPO antes do UPDATE — não dá pra
  // desativar os 3 escopos de um tipo em uso.
  @IsOptional()
  @IsBoolean()
  permitePerfil?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteAtualizacao?: boolean;

  @IsOptional()
  @IsBoolean()
  permiteRecompensa?: boolean;
}
