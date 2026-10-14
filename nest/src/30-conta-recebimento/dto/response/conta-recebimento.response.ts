export class ContaRecebimentoResponse {
  idContaRecebimento: number;
  tipoChave: string;
  // Chave MASCARADA (ex.: ***.456.789-**): a inteira pode ser o CPF da pessoa e nunca volta numa resposta.
  chaveMascarada: string;
  // false = a chave foi guardada mas a titularidade ainda não foi confirmada: não é usada em repasse até isso acontecer.
  titularidadeVerificada: boolean;
  titularidadeVerificadaEm: Date | null;
  ativa: boolean;
  criadaEm: Date;
}
