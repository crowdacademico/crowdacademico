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

// Espelha perfil-pesquisador.request-create.ts: self-service (upgrade da PRÓPRIA conta). `aceiteTermos` segue o
// mesmo padrão de AuthRequestRegister no cadastro (modal de upgrade em T1).
export interface PerfilPesquisadorRequestCreate {
  cpf: string;
  tipoVinculo: TipoVinculo;
  vinculoInstitucional?: string;
  tituloAcademico: TituloAcademico;
  aceiteTermos: boolean;
}

// Espelha perfil-pesquisador.request-create-para-outro.ts: admin criando EM NOME de outra pessoa.
// `aceiteTermos` OPCIONAL (diferente do self-service, que exige `true`): o card "Criar Perfil Pesquisador"
// dentro de ModalAlterarUsuario não manda esse campo (não registra aceite); o cadeado em T1 manda `true`
// (mostrou o Termo de Uso vigente antes, aceite gravado em nome do ALVO).
export interface PerfilPesquisadorRequestCreateParaOutro {
  cpf: string;
  tipoVinculo: TipoVinculo;
  vinculoInstitucional?: string;
  tituloAcademico: TituloAcademico;
  aceiteTermos?: boolean;
}

// Espelha perfil-pesquisador.request-update.ts. Nunca inclui `cpf`, de
// propósito - ver PerfilPesquisadorRequestCorrigirCpf, abaixo.
export interface PerfilPesquisadorRequestUpdate {
  tipoVinculo: TipoVinculo;
  vinculoInstitucional?: string;
  tituloAcademico: TituloAcademico;
}

// Espelha perfil-pesquisador.request-corrigir-cpf.ts: ação de suporte/admin (RF-017), endpoint separado do
// PATCH comum de propósito.
export interface PerfilPesquisadorRequestCorrigirCpf {
  cpf: string;
}

// Espelha perfil-pesquisador.request-suspender.ts: mesmo formato de UsuarioRequestSuspend (auth.type.ts): `ate`
// ISO 8601, `motivo` obrigatório. Suspende só o PODER de pesquisador, não bloqueia login.
export interface PerfilPesquisadorRequestSuspender {
  ate: string;
  motivo: string;
}

// Espelha perfil-pesquisador.response-suspend.ts - mesmo formato de
// UsuarioResponseSuspend.
export interface PerfilPesquisadorResponseSuspend {
  suspensoAte: string | null;
  motivoSuspensao: string | null;
  suspensoPor: number | null;
}
