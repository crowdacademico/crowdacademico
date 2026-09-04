// Validação de FORMATO do CPF (dígito verificador) - não confirma que o CPF
// pertence a uma pessoa real, nem consulta nenhuma fonte externa. Ver
// PENDENCIAS e correcoes.md, item 745: verificação de existência real fica
// pra um momento futuro do projeto, fora de escopo por decisão do Lucas.
import { normalizarCpf } from './cpf-cifra.util';

// Peso inicial 10 pro primeiro dígito verificador (soma multiplicando os 9
// primeiros dígitos por 10,9,8...2), peso inicial 11 pro segundo (soma
// multiplicando os 10 primeiros - os 9 originais + o DV1 já calculado - por
// 11,10,9...2). Mesma função serve pros dois cálculos, só muda o peso
// inicial e a lista de dígitos de entrada.
function calcularDigitoVerificador(
  digitos: number[],
  pesoInicial: number,
): number {
  const soma = digitos.reduce(
    (acumulado, digito, indice) => acumulado + digito * (pesoInicial - indice),
    0,
  );
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

// CPFs de dígito repetido (111.111.111-11, 222.222.222-22 etc.) passam no
// cálculo do dígito verificador normalmente - o algoritmo não os rejeita
// sozinho, precisam ser barrados à parte. Nunca são CPFs reais emitidos.
function todosOsDigitosIguais(cpf: string): boolean {
  return /^(\d)\1{10}$/.test(cpf);
}

export function cpfEhValido(cpfBruto: string): boolean {
  const cpf = normalizarCpf(cpfBruto);
  if (cpf.length !== 11) return false;
  if (todosOsDigitosIguais(cpf)) return false;

  const digitos = cpf.split('').map(Number);
  const digitoVerificador1 = calcularDigitoVerificador(digitos.slice(0, 9), 10);
  const digitoVerificador2 = calcularDigitoVerificador(
    [...digitos.slice(0, 9), digitoVerificador1],
    11,
  );

  return (
    digitos[9] === digitoVerificador1 && digitos[10] === digitoVerificador2
  );
}
