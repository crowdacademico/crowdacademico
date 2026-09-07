import type {
  StatusPesquisador,
  TipoVinculo,
  TituloAcademico,
} from '../constants/status-pesquisador.constants';

// Espelha nest/src/6-perfil-pesquisador/dto/response/*.ts. Os 3 tipos
// importados acima já foram criados na fase 1 (constants/) - reaproveita
// em vez de redefinir a mesma união de novo aqui.

// Espelha perfil-pesquisador.response.ts (PerfilPesquisadorResponse).
export interface PerfilPesquisadorResponse {
  idUsuario: number;
  // `null` quando quem pediu não tem a permissão
  // perfil_pesquisador_visualizar_sensivel - nunca omitido, só não populado.
  cpf: string | null;
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string | null;
  tituloAcademico: TituloAcademico;
  statusPesquisador: StatusPesquisador;
  ativadoEm: string | null;
  scoreAtual: number;
  scoreAtualizadoEm: string | null;
}

// Espelha perfil-pesquisador.response-score.ts.
export interface DimensaoScoreResponse {
  nomeDimensao: string;
  pontosObtidos: number;
  peso: string;
  calculadoEm: string;
  motivo: string | null;
}

export interface PerfilPesquisadorResponseScore {
  idUsuario: number;
  scoreTotal: number;
  rotulo: string | null;
  dimensoes: DimensaoScoreResponse[];
}
