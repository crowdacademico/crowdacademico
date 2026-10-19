import type { TipoChavePix } from '../../constant/type/enums-do-banco.gerado';

// Os VALORES vêm do banco (ENUM tipo_chave_pix, via enums-do-banco.gerado.ts); aqui só o rótulo e a ordem de exibição.
export const ROTULO_TIPO_CHAVE_PIX: Record<TipoChavePix, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave aleatória',
};

export const ORDEM_TIPO_CHAVE_PIX: TipoChavePix[] = ['cpf', 'email', 'telefone', 'aleatoria', 'cnpj'];
