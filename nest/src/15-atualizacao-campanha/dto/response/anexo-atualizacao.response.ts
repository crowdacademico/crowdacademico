// Um anexo de uma atualização: um arquivo enviado ou um link.
export class AnexoAtualizacaoResponse {
  tipo: 'arquivo' | 'link';
  // O id na tabela do tipo (arquivo_atualizacao ou link_atualizacao): só é único junto com o tipo.
  idAnexo: number;
  // Arquivo: o nome original do envio. Link: o tipo de link (GitHub...).
  nome: string;
  // Arquivo: image/png, application/pdf... Link: null.
  tipoMime: string | null;
  // Arquivo: o endereço público no armazenamento. Link: o endereço do link.
  url: string;
}
