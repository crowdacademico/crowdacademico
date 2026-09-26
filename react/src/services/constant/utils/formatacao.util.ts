// Util único de formatação pt-BR: cada tela formatava dinheiro/percentual do seu jeito. Qualquer componente que
// precisa exibir R$ ou % chama uma função daqui, nunca `valor.toFixed(2)` nem template string solto.
const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

// `| null`: `Number(null)` já é `0` em JS, então formatar `null` como zero é o comportamento certo, e o TIPO
// admite isso (evita cada tela ter sua própria cópia local `formatarReais(valor: number | null)` só para tratar
// `null` como zero).
export function formatarMoeda(valor: string | number | null): string {
  return formatadorMoeda.format(Number(valor));
}

// Só a MECÂNICA de formatar mora aqui: sempre 'pt-BR', sempre a mesma chamada de `Intl`. Qual das três
// granularidades usar em qual tela continua decisão de cada view (varia de propósito: auditoria quer hora
// exata, "membro desde" quer só mês/ano): cada call site escolhe a função certa para o próprio contexto.
export function formatarDataHora(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString('pt-BR') : 'Não definida';
}

export function formatarData(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : 'Não definida';
}

export function formatarMesAno(iso: string | null | undefined): string {
  return iso
    ? new Date(iso).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
    : 'Não definida';
}

// CPF: util aqui, não inline no componente, porque aparece em mais de uma tela (cadastro, perfil).
//
// `formatarCpf`: máscara progressiva enquanto digita (000.000.000-00), aceita colar com ou sem pontuação
// (`replace(/\D/g, '')` primeiro).
export function formatarCpf(valor: string | null | undefined): string {
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

// `formatarCpfExibicao`: para EXIBIR um CPF que já chegou COMPLETO da API (Consultar/Bancada), nunca para
// digitar. Proposital não reaproveitar `formatarCpf` (acima): aquela existe para tratar entrada PARCIAL
// enquanto a pessoa digita; são responsabilidades diferentes, com motivo de mudar no futuro diferente (mexer na
// máscara de digitação não devia arriscar mudar uma tela de exibição, e vice-versa), mesmo o resultado batendo
// hoje para um CPF completo. Quem chama decide o que mostrar se `cpf` vier vazio (mensagem, string vazia etc.):
// não é responsabilidade desta função.
export function formatarCpfExibicao(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// `formatarCpfOuMotivoOculto`: formata o CPF quando visível ou explica por que não está (a API só devolve `cpf`
// de verdade para o dono ou quem tem permissão sensível); compartilhada por `consultar-pesquisador.tsx` e
// `bancada-pesquisador.tsx` (Campo de Testes).
export function formatarCpfOuMotivoOculto(cpf: string | null | undefined): string {
  return cpf ? formatarCpfExibicao(cpf) : 'Não visível (sem permissão sensível ou não é o dono)';
}

// Converte um valor de tipo desconhecido para texto exibível sem nunca cair em "[object Object]"
// (`@typescript-eslint/no-base-to-string`): usado pelos componentes genéricos que mostram valor de campo sem
// saber o tipo real de antemão (`CampoSomenteLeitura`, a célula padrão de `GenericTable`, o log de auditoria).
// Nenhum chamador conhecido passa objeto de verdade por aqui: é rede de segurança, não deveria aparecer na
// prática.
// `nomeDimensao` (Score de pesquisador) vem cru do banco (snake_case, ex.: "atualizacao_campanha"):
// centralizado aqui (usado por consultar-pesquisador.tsx e bancada-pesquisador.tsx, T1 do Campo de Testes) para
// as cópias não divergirem.
export function formatarNomeDimensao(nome: string): string {
  return nome
    .split('_')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

export function textoSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return '';
  }
  if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean' || typeof valor === 'bigint') {
    return String(valor);
  }
  // object/função/símbolo: `JSON.stringify` devolve `undefined` para função/símbolo puro (nunca acontece na
  // prática, é só a rede de segurança do tipo cobrindo o caso todo). O tipo embutido do TS para
  // `JSON.stringify` afirma `string` sempre: é o próprio lib.d.ts que mente aqui, não um DTO nosso
  // (`no-unnecessary-condition`), mantido de propósito.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return JSON.stringify(valor) ?? '(valor não representável)';
}
