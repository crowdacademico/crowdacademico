import { AutorizacaoSaqueDto } from '../dto/autorizacao-saque.dto';
import { EventoPagamentoDto } from '../dto/evento-pagamento.dto';

export const WEBHOOK_VERIFIER = 'WEBHOOK_VERIFIER';

export type CabecalhosHttp = Record<string, string | string[] | undefined>;

// Contrato do lado "entrada" do gateway: o webhook. Duas responsabilidades separadas de propósito:
//  1. verificarAutenticidade: decide se a requisição veio mesmo do provedor. O controller chama ANTES de tocar no
//     banco (registrar_evento_pagamento() é SEM autorização de propósito, [05-K-2]: a barreira é esta).
//  2. extrairEvento: traduz o corpo do provedor para EventoPagamentoDto.
export interface WebhookVerifierPort {
  readonly provedor: string;
  verificarAutenticidade(cabecalhos: CabecalhosHttp): boolean;
  extrairEvento(corpo: unknown): EventoPagamentoDto;
  // Autorização de saque por webhook (o provedor pergunta "posso executar esta transferência?" antes de movê-la).
  // `verificarSaque` autentica essa chamada (pode usar outro token que o do webhook comum); `extrairAutorizacaoSaque` a
  // normaliza; `montarRespostaAutorizacaoSaque` produz o corpo EXATO que o provedor espera na resposta.
  verificarAutenticidadeSaque(cabecalhos: CabecalhosHttp): boolean;
  extrairAutorizacaoSaque(corpo: unknown): AutorizacaoSaqueDto;
  montarRespostaAutorizacaoSaque(aprovado: boolean, motivo?: string): unknown;
}
