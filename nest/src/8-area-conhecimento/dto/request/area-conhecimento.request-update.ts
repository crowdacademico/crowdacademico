import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Só `nome` e `ativo` - nunca `codigoCnpq` nem `idPai`, de propósito:
// - `codigoCnpq` é o identificador estável do catálogo CNPq, mesmo
//   raciocínio de `papel.codigo` (ver PapelRequestUpdate em
//   2-papel-permissao) - não editável pela API.
// - `idPai` fica fora deste endpoint porque não existe checagem de
//   ciclo/hierarquia no banco pra area_conhecimento (diferente de um
//   `ON DELETE SET NULL` simples na FK, ver [01] `FK_AREA_CONHECIMENTO_
//   PAI`) - mudar o pai de uma área já existente é reorganização de
//   catálogo que fica fora de escopo até essa regra existir no banco.
export class AreaConhecimentoRequestUpdate {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
