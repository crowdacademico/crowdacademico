// Cifra/decifra o token que vai no link de um e-mail (verificar a conta, recuperar a senha) enquanto ele espera na fila
// (notificacao.dados.segredo). O banco guarda o token só como hash nas tabelas de verificação; aqui ele precisa voltar
// inteiro para montar o link, então fica cifrado com a MESMA receita do CPF (cpf-cifra.util.ts) e é apagado quando o
// e-mail sai. Nunca vai para log.
import { cifrarCpf, decifrarCpf } from './cpf-cifra.util';

export function cifrarSegredoEmail(segredo: string): string {
  return cifrarCpf(segredo);
}

export function decifrarSegredoEmail(valorSalvo: string): string {
  return decifrarCpf(valorSalvo);
}
