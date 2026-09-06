// LGPD Art. 18 (portabilidade/acesso) - item 3 de PROXIMOS_PASSOS.md,
// desenhado em conversa entre o Lucas, o Claude Code e o Claude Web
// (05-09-2026). Um objeto por seção, cada seção como array (mesmo vazio,
// nunca ausente) - fica claro pra quem lê o JSON o que foi verificado e não
// tinha nada, contra o que nem foi incluído de propósito.
//
// O QUE NÃO ENTRA, de propósito (dado de TERCEIRO, não do titular):
// denúncias feitas CONTRA ele (revelaria/permitiria deduzir quem denunciou),
// comentários de OUTRAS pessoas nas campanhas dele, log de auditoria
// (carrega identidade de quem administrou, não do titular).
export class UsuarioResponseExportarDados {
  geradoEm: Date;
  secoesIncluidas: string[];

  conta: {
    idUsuario: number;
    nome: string;
    email: string;
    emailVerificado: boolean;
    criadoEm: Date;
    ultimoLoginEm: Date | null;
  };

  // null = nunca foi/não é pesquisador. cpf mascarado (3 primeiros + 2
  // últimos dígitos) - decisão consciente (ver comentário no service):
  // incluir o CPF em texto puro exigiria construir reautenticação por senha
  // do zero, mecanismo que não existe em nenhum outro lugar do sistema hoje.
  perfilPesquisador: {
    cpfMascarado: string;
    tituloAcademico: string;
    tipoVinculo: string;
    vinculoInstitucional: string | null;
    statusPesquisador: string;
    ativadoEm: Date | null;
    scoreAtual: number;
  } | null;

  linksAcademicos: Array<{
    tipo: string;
    url: string;
    rotulo: string | null;
    ordem: number | null;
  }>;

  // Cada campanha já traz orçamento/cronograma/atualizações embutidos -
  // são satélites dela, não faz sentido listar em seção separada
  // desconectados de qual campanha pertencem.
  campanhas: Array<{
    idCampanha: number;
    titulo: string;
    descricao: string | null;
    status: string;
    modelo: string;
    metaFinanceira: string;
    valorBrutoArrecadado: string;
    criadoEm: Date;
    orcamento: Array<{
      categoria: string;
      descricao: string | null;
      valor: string;
    }>;
    cronograma: Array<{
      titulo: string;
      descricao: string | null;
      dataPrevista: Date;
    }>;
    atualizacoes: Array<{
      titulo: string;
      conteudo: string;
      fase: string | null;
      publicadoEm: Date;
    }>;
  }>;

  // Só os comentários que ELE escreveu (id_pesquisador = titular) - nunca
  // os que recebeu de outros pesquisadores em campanhas dele.
  comentariosEscritos: Array<{
    idCampanha: number;
    conteudo: string;
    endossado: boolean;
    criadoEm: Date;
  }>;

  seguindoCampanhas: Array<{ idCampanha: number; seguidoEm: Date }>;
  seguindoPesquisadores: Array<{ idPesquisador: number; seguidoEm: Date }>;

  contribuicoes: Array<{
    idCampanha: number;
    valor: string;
    meioPagamento: string;
    status: string;
    anonima: boolean;
    criadoEm: Date;
  }>;

  aceitesTermos: Array<{ idTermo: number; aceitoEm: Date }>;

  // Histórico de login (origem='login', mesmo filtro de
  // UsuarioServiceListarLogins - renovação silenciosa de token não conta
  // como "sessão" pra este propósito).
  sessoes: Array<{ logadoEm: Date; ip: string | null }>;
}
