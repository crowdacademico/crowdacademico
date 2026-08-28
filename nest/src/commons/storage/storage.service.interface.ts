// Contrato de armazenamento de arquivos — o ÚNICO ponto que o resto da
// aplicação (25-arquivo, e futuramente qualquer outro módulo) conhece.
// Nenhum service fora de commons/storage deve importar diretamente
// @aws-sdk/*, saber o nome do bucket, ou qualquer detalhe de UM provedor
// específico — é isso que faz "trocar de Backblaze B2 pra Cloudflare R2
// (ou de volta)" ser uma mudança de variável de ambiente, não de código.
//
// Hoje só existe uma implementação (S3CompativelArmazenamentoService,
// storage/s3-compativel-armazenamento.service.ts) porque B2, R2, AWS S3 e
// MinIO falam o mesmo protocolo (S3) — um adapter genérico cobre todos.
// Se um dia entrar um provedor com API genuinamente diferente (não
// S3-compatível), a mudança é: criar uma nova classe implementando esta
// interface e trocar o `provide` em storage.module.ts — nada em
// 25-arquivo muda, porque ele só enxerga ARMAZENAMENTO_SERVICE
// (storage.constants.ts), nunca a classe concreta.
export interface ParametrosUploadPreAssinado {
  // Caminho completo do objeto dentro do bucket (ex.: "pendente/<uuid>.jpg")
  // — decidido pelo service de 25-arquivo, nunca pelo cliente. Ver
  // arquivo.service.iniciar-upload.ts.
  chave: string;
  tipoMime: string;
  // Assinado junto com a URL (vira Content-Length exigido no PUT) — o
  // navegador não consegue enviar um arquivo maior que o declarado, isso é
  // uma camada de proteção ANTES mesmo do arquivo chegar no bucket.
  tamanhoMaximoBytes: number;
  // Só usado hoje pra PDF ("attachment; filename=...") — força o
  // navegador a baixar em vez de tentar renderizar o PDF na própria
  // aba/domínio do bucket. Ver doc de arquitetura, seção "risco de
  // segurança de verdade".
  contentDisposition?: string;
}

export interface UploadPreAssinado {
  urlUpload: string;
  metodo: 'PUT';
  // Cabeçalhos que o cliente PRECISA mandar, com este valor EXATO, no PUT
  // — fazem parte da assinatura da URL; qualquer divergência (tipo,
  // disposition) faz o provedor rejeitar o upload antes de gravar 1 byte.
  cabecalhosObrigatorios: Record<string, string>;
  expiraEm: Date;
}

export interface InfoObjeto {
  existe: boolean;
  tamanhoBytes?: number;
}

export interface ArmazenamentoService {
  /** Gera a URL temporária (PUT) que o navegador usa pra subir o arquivo
   * DIRETO no bucket, sem passar pelo Nest. */
  gerarUploadPreAssinado(
    parametros: ParametrosUploadPreAssinado,
  ): Promise<UploadPreAssinado>;

  /** Confere se o objeto existe de fato no bucket e qual o tamanho real —
   * nunca confiar só no que o cliente diz que enviou. */
  obterInfoObjeto(chave: string): Promise<InfoObjeto>;

  /** Lê só os primeiros N bytes do objeto (Range GET) — o bastante pra
   * conferir a assinatura mágica do formato (JPEG/PNG/WebP/PDF) sem
   * baixar o arquivo inteiro de volta pro servidor. */
  lerPrimeirosBytes(chave: string, quantidadeBytes: number): Promise<Buffer>;

  /** "Move" o objeto de uma chave pra outra (copy + delete — S3 não tem
   * rename/move nativo). Usado pra tirar o arquivo de pendente/ e
   * publicá-lo em publico/ só depois de validado. */
  moverObjeto(chaveOrigem: string, chaveDestino: string): Promise<void>;

  /** Apaga o objeto do bucket. Usado quando a validação de conteúdo falha
   * (limpeza imediata) ou quando um arquivo é removido de verdade. */
  excluirObjeto(chave: string): Promise<void>;

  /** Monta a URL pública de leitura a partir da chave — string pura,
   * nenhuma chamada de rede (o bucket é público, ver doc de arquitetura:
   * "nenhum arquivo de vocês é secreto"). */
  montarUrlPublica(chave: string): string;
}
