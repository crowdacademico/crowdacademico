// Util único de formatação pt-BR — pedido do Claude Web ao olhar o Projeto
// de Interface (Gemini): cada tela formatava dinheiro/percentual do seu
// jeito. Qualquer componente que precisa exibir R$ ou % chama uma função
// daqui, nunca `valor.toFixed(2)` nem template string solto.
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatarMoeda(valor) {
  return formatadorMoeda.format(Number(valor));
}

export function formatarPercentual(valor) {
  const numero = Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${numero}%`;
}

// CPF (10-08-2026, rodada Claude Web "embelezar o painel", item 2: seção
// Perfil de Pesquisador demonstrativa em Alterar Usuário) — util aqui, não
// inline no componente, porque vai aparecer em mais de uma tela quando o
// módulo 6-perfil-pesquisador existir de verdade (cadastro, perfil).
//
// `formatarCpf` — máscara progressiva enquanto digita (000.000.000-00),
// aceita colar com ou sem pontuação (`replace(/\D/g, '')` primeiro).
export function formatarCpf(valor) {
  const digitos = String(valor ?? '')
    .replace(/\D/g, '')
    .slice(0, 11);
  const bloco1 = digitos.slice(0, 3);
  const bloco2 = digitos.slice(3, 6);
  const bloco3 = digitos.slice(6, 9);
  const digitosVerificadores = digitos.slice(9, 11);

  let resultado = bloco1;
  if (bloco2) {
    resultado += '.' + bloco2;
  }
  if (bloco3) {
    resultado += '.' + bloco3;
  }
  if (digitosVerificadores) {
    resultado += '-' + digitosVerificadores;
  }
  return resultado;
}

// `mascararCpf` — pra EXIBIR (Consultar), não pra digitar: esconde o meio,
// mostra só o 1º bloco e os dígitos verificadores (ex.: "123.***.**9-00").
// CPF incompleto/inválido volta cru, sem tentar mascarar pela metade.
export function mascararCpf(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  if (digitos.length !== 11) {
    return valor ? String(valor) : '';
  }
  const bloco1 = digitos.slice(0, 3);
  const ultimoDigitoBloco3 = digitos.slice(8, 9);
  const digitosVerificadores = digitos.slice(9, 11);
  return `${bloco1}.***.**${ultimoDigitoBloco3}-${digitosVerificadores}`;
}
