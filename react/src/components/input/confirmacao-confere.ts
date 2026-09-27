// Confirmação por digitação antes de uma ação sem volta (excluir conta, excluir campanha): a pessoa digita o
// e-mail ou o título, e o botão só libera quando bate. Maiúsculas e espaços nas pontas não contam.
export function confirmacaoConfere(digitado: string, esperado: string): boolean {
  return digitado.trim().toLowerCase() === esperado.trim().toLowerCase();
}
