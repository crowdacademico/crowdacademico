import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class TipoLinkRequestCreate {
  // Chave estável, nunca editável depois (ver comentário no response DTO)
  // - convenção MAIÚSCULO_COM_UNDERSCORE, igual todo `codigo` já seedado
  // (LATTES, ORCID, RESEARCHGATE, LINKEDIN, GITHUB, SITE_INSTITUCIONAL,
  // OUTRO, ver 07_seed_dados.sql [07-C-1]). UK_TIPO_LINK_CODIGO (01)
  // garante unicidade no banco; aqui só a forma é validada.
  @IsString()
  @MaxLength(20) // bate com tipo_link.codigo VARCHAR(20), 01_extensoes_enums_tabelas.sql
  @Matches(/^[A-Z0-9_]+$/, {
    message:
      'codigo só pode ter letras maiúsculas, números e underscore (ex.: "SITE_INSTITUCIONAL").',
  })
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100) // bate com tipo_link.nome VARCHAR(100)
  nome: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  // TEXT no banco, NULLABLE, sem default - complemento OPCIONAL de
  // `dominio` (mecanismo de validação PRINCIPAL, ver abaixo): só preencha
  // quando o domínio sozinho não garante URL válida (ex.: exigir que seja
  // um perfil específico, não a home do site). Omita (ou mande `null`)
  // quando o domínio já é suficiente (a maioria dos casos). 500 é só um
  // teto de sanidade do lado da aplicação, não uma constraint do SQL.
  // Validado como regex de verdade (não só formato de string) pelo
  // service quando informado, pra nunca gravar um padrão que quebraria
  // quem for usá-lo depois (7-link-academico).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  regex?: string | null;

  // VARCHAR(255)[] no banco, NOT NULL DEFAULT '{}' - mecanismo de
  // validação PRINCIPAL: quem gravar um link de verdade confere se o host
  // da URL está nesta lista. Array nativo do Postgres, não mais um
  // domínio só (um tipo pode aceitar mais de um, ex.: GitHub também
  // responde em gist.github.com). Omita (deixa a coluna cair no DEFAULT
  // '{}') pros tipos sem domínio fixo pra validar (ex.: SITE_
  // INSTITUCIONAL, OUTRO) - a coluna não aceita `null`, então não é uma
  // opção aqui. `ArrayMaxSize(20)` é só sanidade (nenhum tipo real deve
  // precisar de mais que isso).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(255, { each: true }) // bate com cada elemento de tipo_link.dominio VARCHAR(255)[]
  dominio?: string[];

  // Os 3 campos de escopo - pelo menos um precisa ser TRUE no resultado
  // final (CK_TIPO_LINK_ALGUM_ESCOPO, 01_extensoes_enums_tabelas.sql), o
  // service confere isso combinando com os defaults abaixo antes do
  // INSERT. Defaults iguais aos do banco (permite_perfil TRUE, os outros
  // dois FALSE) - omitir os 3 aqui equivale a um tipo só de identidade de
  // perfil, igual LATTES/ORCID/RESEARCHGATE/LINKEDIN no seed.
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
