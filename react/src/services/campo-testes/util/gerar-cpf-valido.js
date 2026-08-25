// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

// Mesmo algoritmo de nest/src/commons/seguranca/cpf-validador.util.ts
// (dígito verificador, peso 10/11), reimplementado aqui só pra GERAR um
// CPF de teste com dígito válido de verdade (o botão [gerar CPF válido]
// da Bancada do Pesquisador, T1), não pra validar nada em produção. Só
// formato, nunca confere se o CPF pertence a alguém real (mesma
// ressalva do arquivo original, ver PENDENCIAS e correcoes.md, item 745).
function calcularDigitoVerificador(digitos, pesoInicial) {
  const soma = digitos.reduce((acumulado, digito, indice) => acumulado + digito * (pesoInicial - indice), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function gerarCpfValido() {
  // 9 dígitos aleatórios, redesenhados se saírem todos iguais (CPF de
  // dígito repetido, tipo 111.111.111-XX, é barrado à parte no validador
  // real, mais simples nunca gerar um assim do que gerar e descartar).
  let base;
  do {
    base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  } while (base.every((digito) => digito === base[0]));

  const digitoVerificador1 = calcularDigitoVerificador(base, 10);
  const digitoVerificador2 = calcularDigitoVerificador([...base, digitoVerificador1], 11);
  return [...base, digitoVerificador1, digitoVerificador2].join('');
}
