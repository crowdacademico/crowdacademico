// Espelha nest/src/1-usuario/dto/response/usuario.response-export-data.ts (GET /usuario/eu/exportar-dados). Datas e
// valores chegam como texto no JSON.
export interface ExportacaoDados {
  geradoEm: string;
  secoesIncluidas: string[];
  conta: {
    idUsuario: number;
    nome: string;
    email: string;
    emailVerificado: boolean;
    criadoEm: string;
    ultimoLoginEm: string | null;
  };
  perfilPesquisador: {
    cpfMascarado: string;
    tituloAcademico: string;
    tipoVinculo: string;
    vinculoInstitucional: string | null;
    statusPesquisador: string;
    ativadoEm: string | null;
    scoreAtual: number;
  } | null;
  linksAcademicos: { tipo: string; url: string; rotulo: string | null; ordem: number | null }[];
  campanhas: {
    idCampanha: number;
    titulo: string;
    descricao: string | null;
    status: string;
    modelo: string;
    metaFinanceira: string;
    valorBrutoArrecadado: string;
    criadoEm: string;
    orcamento: { categoria: string; descricao: string | null; valor: string }[];
    cronograma: { titulo: string; descricao: string | null; dataPrevista: string }[];
    atualizacoes: { titulo: string; conteudo: string; fase: string | null; publicadoEm: string }[];
  }[];
  comentariosEscritos: { idCampanha: number; tituloCampanha: string | null; conteudo: string; endossado: boolean; criadoEm: string }[];
  seguindoCampanhas: { idCampanha: number; tituloCampanha: string | null; seguidoEm: string }[];
  seguindoPesquisadores: { idPesquisador: number; nomePesquisador: string | null; seguidoEm: string }[];
  contribuicoes: {
    idCampanha: number;
    tituloCampanha: string | null;
    valor: string;
    meioPagamento: string;
    status: string;
    anonima: boolean;
    criadoEm: string;
  }[];
  aceitesTermos: { idTermo: number; tipoTermo: string | null; versao: string | null; aceitoEm: string }[];
  historicoRejeicoes: { idCampanha: number; tituloCampanha: string; justificativa: string | null; rejeitadoEm: string }[];
  sessoes: { logadoEm: string; ip: string | null }[];
  // Dias que as sessões ficam guardadas (0 = para sempre); os logins mais antigos já foram apagados.
  sessoesRetencaoDias: number;
}
