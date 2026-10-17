// Formatos de JSON do Asaas (API v3). ESTE ARQUIVO É O ÚNICO QUE DESCREVE O FORMATO DO PROVEDOR: nada fora de
// 29-pagamento/adapters/asaas importa isto nem sabe o nome "Asaas" (regra de lint em eslint.config.mjs). Campos que o
// sistema não usa ficam de fora de propósito. Todos opcionais/nulos onde a documentação deles diz que podem faltar.
export interface AsaasErroCorpo {
  errors?: { code?: string; description?: string }[];
}

export interface AsaasLista<T> {
  data: T[];
  hasMore?: boolean;
  totalCount?: number;
}

export interface AsaasRefund {
  // DONE = devolvido de fato; PENDING/REQUESTED etc. = ainda não. Só DONE conta como devolvido (docs "Estornos").
  status?: string;
  value?: number;
  description?: string | null;
}

export interface AsaasPayment {
  id: string;
  // PENDING, CONFIRMED, RECEIVED, RECEIVED_IN_CASH, OVERDUE, REFUNDED, REFUND_REQUESTED, REFUND_IN_PROGRESS, ...
  status: string;
  value: number;
  // O que cai na conta: value menos a tarifa do Asaas. Já vem na criação, antes do pagamento.
  netValue?: number;
  billingType?: string;
  dueDate?: string;
  externalReference?: string | null;
  deleted?: boolean;
  refunds?: AsaasRefund[] | null;
}

export interface AsaasPixQrCode {
  // Imagem do QR em base64 (sem prefixo data:).
  encodedImage: string;
  // "Copia e cola".
  payload: string;
  expirationDate?: string;
}

export interface AsaasTransfer {
  id: string;
  // PENDING, IN_BANK_PROCESSING/BANK_PROCESSING, BLOCKED, DONE, FAILED, CANCELLED.
  status: string;
  value: number;
  externalReference?: string | null;
  failReason?: string | null;
  pixAddressKey?: string | null;
  // Na transferência Pix o Asaas devolve a chave aqui dentro (conferido no sandbox), não no nível de cima.
  bankAccount?: { pixAddressKey?: string | null } | null;
}

// Resposta da consulta de chave Pix externa (DICT). O nome exato dos campos NÃO está na documentação pública: o que se
// sabe é que "cpfCnpj" volta mascarado (ex.: ***.202.745-**). Os demais nomes abaixo são tentativas tolerantes.
// VERIFICAR NO SANDBOX (só a chave 47996515839 é consultável lá) e ajustar aqui se o JSON real for outro.
// O titular vem em `owner` (resposta do GET /pix/addressKeys/external, conferida no sandbox).
export interface AsaasChavePixExterna {
  key?: string;
  owner?: { name?: string; cpfCnpj?: string };
}

// Corpo de um webhook de cobrança/transferência (e do pedido de validação de saque).
export interface AsaasWebhookCorpo {
  id?: string;
  event?: string;
  type?: string;
  payment?: Partial<AsaasPayment>;
  transfer?: Partial<AsaasTransfer>;
}

export const TIPO_CHAVE_PIX_ASAAS = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'EMAIL',
  telefone: 'PHONE',
  aleatoria: 'EVP',
} as const;
