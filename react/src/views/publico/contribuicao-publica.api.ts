import { tratarResposta } from '../../services/constant/api/http.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';

export interface ContribuicaoPixPublica {
  copiaECola: string;
  qrCodeBase64?: string;
  expiraEm: string;
}

export interface ContribuicaoCriadaPublica {
  idContribuicao: number;
  tokenSessao: string;
  idCampanha: number;
  valor: number;
  taxaPagamento: number;
  valorCobrado: number;
  meioPagamento: string;
  status: string;
  criadoEm: string;
  pix?: ContribuicaoPixPublica;
}

export interface StatusContribuicaoPublica {
  idContribuicao: number;
  idCampanha: number;
  valor: number;
  meioPagamento: string;
  status: string;
  criadoEm: string;
}

export interface ContribuicaoPublicaRequest {
  idCampanha: number;
  valor: number;
  meioPagamento: 'pix';
}

export const contribuicaoPublicaApi = {
  criar: (
    authFetch: AuthFetch,
    dados: ContribuicaoPublicaRequest,
  ): Promise<ContribuicaoCriadaPublica> =>
    authFetch('/contribuicao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    }).then(tratarResposta<ContribuicaoCriadaPublica>),

  buscar: (
    authFetch: AuthFetch,
    idContribuicao: number,
    tokenSessao: string,
  ): Promise<StatusContribuicaoPublica> =>
    authFetch(`/contribuicao/${idContribuicao}`, {
      headers: { 'X-Token-Sessao': tokenSessao },
    }).then(tratarResposta<StatusContribuicaoPublica>),
};
