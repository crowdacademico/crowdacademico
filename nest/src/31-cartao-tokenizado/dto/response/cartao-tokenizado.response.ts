// Nunca traz o token do cartão: só o que a pessoa precisa para reconhecer o cartão na tela.
export class CartaoTokenizadoResponse {
  idCartao: number;
  bandeira: string | null;
  ultimosDigitos: string;
  ativo: boolean;
  criadoEm: Date;
}
