import { BadRequestException } from '@nestjs/common';
import { cpfEhValido } from '../../commons/seguranca/cpf-validador.util';
import type { TipoChavePix } from '../../commons/database/db.types';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function digitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function cnpjEhValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const calcular = (base: string): number => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base
      .split('')
      .reduce((total, d, i) => total + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calcular(cnpj.slice(0, 12));
  const d2 = calcular(cnpj.slice(0, 12) + String(d1));
  return cnpj.endsWith(`${d1}${d2}`);
}

// Normaliza e valida a chave pelo tipo. A forma normalizada é a que vai para o diretório (DICT) e para o banco (cifrada):
// cpf/cnpj só dígitos; telefone no formato +55DDDNÚMERO; e-mail em minúsculas; aleatória em minúsculas.
export function normalizarChavePix(tipo: TipoChavePix, bruta: string): string {
  const texto = bruta.trim();
  switch (tipo) {
    case 'cpf': {
      const cpf = digitos(texto);
      if (!cpfEhValido(cpf)) {
        throw new BadRequestException('CPF da chave Pix inválido.');
      }
      return cpf;
    }
    case 'cnpj': {
      const cnpj = digitos(texto);
      if (!cnpjEhValido(cnpj)) {
        throw new BadRequestException('CNPJ da chave Pix inválido.');
      }
      return cnpj;
    }
    case 'email': {
      const email = texto.toLowerCase();
      if (email.length > 77 || !REGEX_EMAIL.test(email)) {
        throw new BadRequestException('E-mail da chave Pix inválido.');
      }
      return email;
    }
    case 'telefone': {
      let numero = digitos(texto);
      if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
      if (
        numero.length < 12 ||
        numero.length > 13 ||
        !numero.startsWith('55')
      ) {
        throw new BadRequestException(
          'Telefone da chave Pix inválido (use DDD + número).',
        );
      }
      return `+${numero}`;
    }
    default: {
      const uuid = texto.toLowerCase();
      if (!REGEX_UUID.test(uuid)) {
        throw new BadRequestException('Chave aleatória inválida.');
      }
      return uuid;
    }
  }
}

// Forma que pode ser MOSTRADA: nunca a chave inteira (ela pode ser o CPF da pessoa).
export function mascararChavePix(tipo: TipoChavePix, chave: string): string {
  switch (tipo) {
    case 'cpf':
      return `***.${chave.slice(3, 6)}.${chave.slice(6, 9)}-**`;
    case 'cnpj':
      return `**.***.***/${chave.slice(8, 12)}-**`;
    case 'email': {
      const [usuario, dominio] = chave.split('@');
      return `${usuario.slice(0, 1)}***@${dominio}`;
    }
    case 'telefone':
      return `+** (**) *****-${chave.slice(-4)}`;
    default:
      return `****-****-****-${chave.slice(-4)}`;
  }
}

// Compara o documento da PESSOA (só dígitos) com o do titular da chave como o provedor informou, que pode vir mascarado
// ("***.456.789-**"): '*' vale como curinga. Exige pelo menos 6 dígitos visíveis, senão uma máscara quase total
// "bateria" com qualquer documento.
export function documentosCompativeis(
  documentoPessoa: string,
  documentoTitular: string,
): boolean {
  const pessoa = digitos(documentoPessoa);
  const titular = documentoTitular.replace(/[^0-9*]/g, '');
  if (pessoa.length !== titular.length) return false;
  const visiveis = titular.replace(/\*/g, '').length;
  if (visiveis < 6) return false;
  return titular.split('').every((c, i) => c === '*' || c === pessoa[i]);
}
