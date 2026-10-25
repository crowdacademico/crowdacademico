import type { FaseAtualizacao, TipoAtualizacao } from '../../constant/type/enums-do-banco.gerado';

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
}

// Espelha AnexoAtualizacaoResponse (nest/src/15-atualizacao-campanha/dto/response). idAnexo só é único junto com o
// tipo; url: do arquivo no armazenamento ou do link; quando: envio do arquivo, ou publicação da atualização (link).
export interface AnexoAtualizacaoResponse {
  tipo: 'arquivo' | 'link';
  idAnexo: number;
  idAtualizacao: number;
  tituloAtualizacao: string;
  atualizacaoAtiva: boolean;
  idCampanha: number;
  tituloCampanha: string | null;
  nome: string;
  url: string | null;
  quando: string;
}

export interface AtualizacaoCampanhaRequestCreate {
  idCampanha: number;
  titulo: string;
  conteudo: string;
  fase: FaseAtualizacao;
  tipo: TipoAtualizacao;
}
