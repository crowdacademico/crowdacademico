// Quem aparece como "de" no e-mail (EMAIL_REMETENTE e EMAIL_REMETENTE_NOME). No Brevo, o endereço precisa ser de um
// domínio autenticado na conta; Gmail, Yahoo e afins não podem ser remetente (ver .Tutorial-email.md).
export interface Remetente {
  email: string;
  nome: string;
}
