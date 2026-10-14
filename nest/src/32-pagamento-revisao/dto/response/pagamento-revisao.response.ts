export class RevisaoPagamentoResponse {
  idEvento: number;
  provedor: string;
  tipoEvento: string;
  recebidoEm: Date;
  situacao: 'em_revisao_manual' | 'vale_tentar_de_novo';
  motivo: string | null;
  revisaoManualEm: Date | null;
  // De onde veio o dinheiro/efeito (preenchido nas revisões que deixaram auditoria).
  idContribuicao: number | null;
  idRepasse: number | null;
}

export class ReembolsoManualResponse {
  idContribuicao: number;
  idCampanha: number;
  // null = contribuição feita sem conta.
  idUsuario: number | null;
  valorBruto: number;
  // O LÍQUIDO a devolver: a taxa da plataforma fica retida (mesma conta do estorno automático).
  valorADevolver: number;
  meioPagamento: string;
  tentativas: number;
  ultimoMotivo: string | null;
  // Quem contribuiu tem chave Pix de recebimento verificada para onde devolver (a chave em si não sai daqui).
  contribuinteTemContaVerificada: boolean;
}

export class RepasseAtencaoResponse {
  idRepasse: number;
  idCampanha: number;
  titulo: string;
  status: string;
  valorLiquido: number;
  tentativas: number;
  idTransferenciaApi: string | null;
  ultimoMotivo: string | null;
  // true = o dono da campanha ainda não cadastrou/verificou a chave Pix: o repasse espera na fila, sem erro.
  aguardandoConta: boolean;
}
