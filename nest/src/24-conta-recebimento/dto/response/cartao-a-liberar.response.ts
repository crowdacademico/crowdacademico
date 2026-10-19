// Dinheiro de cartão já pago numa campanha do próprio pesquisador que o provedor ainda não liberou (fica fora do repasse
// até lá). Uma linha por campanha.
export class CartaoALiberarResponse {
  idCampanha: number;
  tituloCampanha: string;
  valor: number;
  // Previsão: a confirmação mais recente + o prazo do parâmetro cartao_dias_liberacao.
  previstoPara: Date;
}
