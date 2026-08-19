import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class AreaConhecimentoRequestCreate {
  // Formato oficial da tabela de áreas do conhecimento do CNPq: grande
  // área.área.subárea.especialidade, sempre 2 dígitos por nível (ex.:
  // '1.00.00.00' pra grande área "Ciências Exatas e da Terra',
  // '1.03.00.00' pra área filha "Ciência da Computação") — ver seed em
  // 07_seed_dados.sql [07-C-2]. `UK_AREA_CONHECIMENTO_CODIGO_CNPQ` (01)
  // garante unicidade no banco; aqui só a forma é validada.
  @IsString()
  @Matches(/^\d{1,2}\.\d{2}\.\d{2}\.\d{2}$/, {
    message: 'codigoCnpq precisa seguir o formato do CNPq, ex.: "1.03.00.00".',
  })
  codigoCnpq: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100) // bate com area_conhecimento.nome VARCHAR(100), 01_extensoes_enums_tabelas.sql
  nome: string;

  // Ausente/omitido = grande área raiz (nível 1). Informado = área de
  // nível 2, filha da grande área apontada — o service confere que o pai
  // é de fato uma grande área raiz (id_pai IS NULL) antes de gravar,
  // porque o banco não tem constraint nenhuma travando um 3º nível (a
  // trigger fn_valida_area_conhecimento_nivel2, em 05_regras_negocio.sql
  // [05-K-1], só valida o lado de campanha, não a hierarquia da própria
  // area_conhecimento).
  @IsOptional()
  @IsInt()
  @Min(1)
  idPai?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
