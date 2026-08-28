export class ArquivoResponse {
  idArquivo: number;
  // URL pública completa, já montada (STORAGE_PUBLIC_BASE_URL + chave) —
  // o front nunca precisa saber que por trás disso existe uma "chave" de
  // objeto ou qual provedor de armazenamento está servindo o arquivo.
  url: string;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  ativo: boolean;
  criadoEm: Date;
  desativadoEm: Date | null;
}
