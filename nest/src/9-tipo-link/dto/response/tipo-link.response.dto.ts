export class TipoLinkResponseDto {
  idTipolink: number;
  // Chave estável (UK_TIPO_LINK_CODIGO), lida por calcular_score_perfil_
  // academico() pra reconhecer Lattes/ORCID (05_regras_negocio.sql
  // [05-I-2]) — nunca editável depois de criado, só exibido.
  codigo: string;
  nome: string;
  ativo: boolean;
  dominio: string[];
  regex: string | null;
  // Escopos de uso — CK_TIPO_LINK_ALGUM_ESCOPO (01) exige pelo menos um
  // TRUE; trg_valida_escopo_tipolink (05_regras_negocio.sql [05-K-1])
  // barra na gravação de link_academico/link_atualizacao/link_recompensa
  // qualquer id_tipolink cujo campo correspondente aqui seja FALSE.
  permitePerfil: boolean;
  permiteAtualizacao: boolean;
  permiteRecompensa: boolean;
}
