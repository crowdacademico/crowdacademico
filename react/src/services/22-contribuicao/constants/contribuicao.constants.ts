import type { MeioPagamento } from '../../constant/type/enums-do-banco.gerado';

// Os VALORES vêm do banco (ENUM meio_pagamento, via enums-do-banco.gerado.ts); aqui fica só o rótulo legível. O
// POST /contribuicao aceita hoje só Pix, mas o enum tem mais valores: o Record acusa rótulo faltando.
export const ROTULO_MEIO_PAGAMENTO: Record<MeioPagamento, string> = {
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  boleto: 'Boleto',
};
