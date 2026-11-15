import type { TipoChavePix } from '../../constant/type/enums-do-banco.gerado';

// Máscara e conferência da chave Pix pelo tipo (16-11-2026, pedido da Alexia): o campo só aceita o que o tipo permite,
// já formatado enquanto digita, como o CPF do gov.br. As MESMAS regras de nest/src/24-conta-recebimento/util/
// chave-pix.util.ts (normalizarChavePix), que continua sendo quem decide: lá a chave é normalizada (só dígitos no
// CPF/CNPJ, +55 no telefone) antes de ir ao diretório Pix, então a pontuação daqui não atrapalha.

const digitos = (valor: string) => valor.replace(/\D/g, '');

function blocos(valor: string, tamanhos: number[], separadores: string[]): string {
  let resultado = '';
  let inicio = 0;
  tamanhos.forEach((tamanho, indice) => {
    const parte = valor.slice(inicio, inicio + tamanho);
    if (parte) resultado += (indice > 0 ? separadores[indice - 1] : '') + parte;
    inicio += tamanho;
  });
  return resultado;
}

// Formata enquanto digita; o que não cabe no tipo é descartado (letra no CPF, o 12º dígito, um "g" na chave aleatória).
export function mascararChavePix(tipo: TipoChavePix, valor: string): string {
  switch (tipo) {
    case 'cpf':
      return blocos(digitos(valor).slice(0, 11), [3, 3, 3, 2], ['.', '.', '-']);
    case 'cnpj':
      return blocos(digitos(valor).slice(0, 14), [2, 3, 3, 4, 2], ['.', '.', '/', '-']);
    case 'telefone': {
      let numero = digitos(valor);
      // Colou com o código do país (+55 11 9...): fica só DDD + número.
      if (numero.length > 11 && numero.startsWith('55')) numero = numero.slice(2);
      numero = numero.slice(0, 11);
      const ddd = numero.slice(0, 2);
      const resto = numero.slice(2);
      if (!resto) return ddd ? `(${ddd}` : '';
      const corte = resto.length > 8 ? 5 : 4;
      return `(${ddd}) ${resto.slice(0, corte)}${resto.length > corte ? '-' + resto.slice(corte) : ''}`;
    }
    case 'email':
      return valor.replace(/\s/g, '').slice(0, 77);
    default: {
      // Chave aleatória (UUID): 32 dígitos hexadecimais, com os hífens 8-4-4-4-12 postos sozinhos.
      const hexa = valor.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 32);
      return blocos(hexa, [8, 4, 4, 4, 12], ['-', '-', '-', '-']);
    }
  }
}

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = base.split('').reduce((total, d, i) => total + Number(d) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  const d1 = digitoVerificador(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(cpf.slice(0, 9) + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cpf.endsWith(`${d1}${d2}`);
}

function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const d1 = digitoVerificador(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digitoVerificador(cnpj.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${d1}${d2}`);
}

// O que está errado na chave, ou null. Vazia não é erro aqui (quem chama decide se é obrigatória).
export function erroChavePix(tipo: TipoChavePix, valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return null;
  switch (tipo) {
    case 'cpf':
      return cpfValido(digitos(texto)) ? null : 'CPF inválido: confira os 11 números.';
    case 'cnpj':
      return cnpjValido(digitos(texto)) ? null : 'CNPJ inválido: confira os 14 números.';
    case 'telefone': {
      const numero = digitos(texto);
      return numero.length === 10 || numero.length === 11 ? null : 'Informe o DDD e o número do telefone.';
    }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto) ? null : 'E-mail inválido.';
    default:
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(texto)
        ? null
        : 'A chave aleatória tem 32 letras e números (como no seu banco).';
  }
}

// O que o teclado do celular mostra e o exemplo do campo, por tipo.
export const ENTRADA_CHAVE_PIX: Record<TipoChavePix, { inputMode: 'numeric' | 'tel' | 'email' | 'text'; exemplo: string }> = {
  cpf: { inputMode: 'numeric', exemplo: '000.000.000-00' },
  cnpj: { inputMode: 'numeric', exemplo: '00.000.000/0000-00' },
  telefone: { inputMode: 'tel', exemplo: '(00) 00000-0000' },
  email: { inputMode: 'email', exemplo: 'seu@email.com' },
  aleatoria: { inputMode: 'text', exemplo: '00000000-0000-0000-0000-000000000000' },
};
