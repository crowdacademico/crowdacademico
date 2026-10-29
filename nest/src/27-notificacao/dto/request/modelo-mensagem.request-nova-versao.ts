import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Conteúdo de uma NOVA versão de um modelo (e-mail ou sino). O texto de uma versão nunca é editado no lugar: o banco
 * bloqueia (fn_protege_modelo_mensagem). O canal vem do modelo de origem, não do corpo da requisição.
 */
export class ModeloMensagemRequestNovaVersao {
  /** E-mail: assunto. Sino: título. */
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titulo_template!: string;

  /** E-mail: corpo em texto. Sino: mensagem. */
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  corpo_texto_template!: string;

  /** Só e-mail. Omitido = mantém o HTML da versão de origem; null = remove (o HTML passa a ser derivado do texto). */
  @IsOptional()
  @IsString()
  @MaxLength(30000)
  corpo_html_template?: string | null;
}
