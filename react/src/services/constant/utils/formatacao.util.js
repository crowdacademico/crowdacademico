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
