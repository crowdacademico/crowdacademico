import {
  StatusPesquisador,
  TipoVinculo,
  TituloAcademico,
} from '../../../commons/database/db.types';

// `cpf` é `null` quando quem pediu não tem a permissão
// `perfil_pesquisador_visualizar_sensivel` — nunca omitido do tipo (pra não
// esconder do front que o campo existe), só nunca populado com o valor real
// sem a permissão. Nunca inclui cpf_hash (não é dado de exibição nenhuma,
// é só chave de busca interna do backend).
export class PerfilPesquisadorResponse {
  idUsuario: number;
  cpf: string | null;
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string | null;
  tituloAcademico: TituloAcademico;
  statusPesquisador: StatusPesquisador;
  ativadoEm: Date | null;
  scoreAtual: number;
  scoreAtualizadoEm: Date | null;
}
