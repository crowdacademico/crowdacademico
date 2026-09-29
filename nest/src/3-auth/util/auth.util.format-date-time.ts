// toISOString() cru ("...T00:28:27.382Z") não significa nada para quem não programa: as mensagens de
// bloqueio/suspensão do login e da renovação de sessão são as únicas do projeto que embutem uma data DENTRO de uma
// frase de erro (todo o resto do app formata no React com toLocaleString('pt-BR'), mas aqui a data precisa estar
// pronta dentro do texto do throw). timeZone explícito (não o padrão do processo Node) porque o servidor pode rodar
// em UTC mesmo o público sendo brasileiro.
export function formatarDataHoraBr(data: Date): string {
  const dataFormatada = data.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  });
  const horaFormatada = data.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dataFormatada} - ${horaFormatada}`;
}
