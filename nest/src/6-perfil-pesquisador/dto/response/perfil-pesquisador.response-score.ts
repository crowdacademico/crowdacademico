// Consulta de score/dimensões (PROXIMOS_MODULOS.md, Grupo 2) - lê
// score_pesquisador + score_config + score_rotulo, todas escritas só por
// recalcular_score_pesquisador() (05_regras_negocio.sql), nunca pelo Nest.
export class DimensaoScoreResponse {
  nomeDimensao: string;
  pontosObtidos: number;
  peso: string;
  calculadoEm: Date;
  motivo: string | null;
}

export class PerfilPesquisadorResponseScore {
  idUsuario: number;
  scoreTotal: number;
  rotulo: string | null;
  dimensoes: DimensaoScoreResponse[];
}
