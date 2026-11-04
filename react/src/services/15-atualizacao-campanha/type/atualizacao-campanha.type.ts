import type { FaseAtualizacao, TipoAtualizacao } from '../../constant/type/enums-do-banco.gerado';

// Espelha AnexoAtualizacaoResponse (nest/src/15-atualizacao-campanha/dto/response). idAnexo só é único junto com o
// tipo. nome: do arquivo enviado, ou o tipo do link (GitHub...). tipoMime: só arquivo.
export interface AnexoAtualizacao {
  tipo: 'arquivo' | 'link';
  idAnexo: number;
  nome: string;
  tipoMime: string | null;
  url: string;
}

// Espelha AtualizacaoCampanhaResponse (nest/src/15-atualizacao-campanha/dto/response).
export interface AtualizacaoCampanhaResponse {
  idAtualizacao: number;
  idCampanha: number;
  titulo: string;
  conteudo: string;
  publicadoEm: string;
  fase: FaseAtualizacao;
  tipo: TipoAtualizacao;
  ativo: boolean;
  // Oculta pela moderação: o dono não mostra de novo. false com ativo false: o próprio dono ocultou.
  ocultadaModeracao: boolean;
  anexos: AnexoAtualizacao[];
}

// Na lista da moderação, com o título da campanha (null = a campanha não está visível para quem pediu).
export interface AtualizacaoModeracaoResponse extends AtualizacaoCampanhaResponse {
  tituloCampanha: string | null;
}

export interface AtualizacaoCampanhaRequestCreate {
  idCampanha: number;
  titulo: string;
  conteudo: string;
  fase: FaseAtualizacao;
  tipo: TipoAtualizacao;
  // Arquivos já enviados (arquivoApi) e links, gravados junto com a atualização.
  idsArquivos?: number[];
  links?: { idTipoLink: number; url: string }[];
}

export interface AtualizacaoCampanhaRequestUpdate {
  titulo?: string;
  conteudo?: string;
  fase?: FaseAtualizacao;
  ativo?: boolean;
}
