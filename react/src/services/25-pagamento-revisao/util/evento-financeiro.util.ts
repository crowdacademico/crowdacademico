import { ROTULO_STATUS_CONTRIBUICAO } from '../../22-contribuicao/constants/status-contribuicao.constants';
import { ROTULO_STATUS_REPASSE } from '../../23-pagamento/constants/status-repasse.constants';

// O banco grava em auditoria_financeira.evento um código ("status_repasse: erro -> pendente: reenfileirado: ...").
// Quem opera lê a frase; a Auditoria Financeira continua mostrando o código, como o banco grava. Código que não
// está aqui aparece como veio: nunca some.
const rotuloRepasse = (s: string) => (ROTULO_STATUS_REPASSE as Partial<Record<string, string>>)[s] ?? s;
const rotuloContribuicao = (s: string) => (ROTULO_STATUS_CONTRIBUICAO as Partial<Record<string, string>>)[s] ?? s;
const comPonto = (t: string) => {
  const limpo = t.trim().replace(/[;:,]+$/, '');
  return /[.!?]$/.test(limpo) ? limpo : `${limpo}.`;
};

function fraseDoMotivoDoRepasse(motivo: string): string {
  const tentativa = motivo.match(/^tentativa (\d+): ([\s\S]*)$/);
  if (tentativa) return `A tentativa ${tentativa[1]} de transferência falhou: ${comPonto(tentativa[2])}`;
  const reenfileirado = motivo.match(/^reenfileirado: ([\s\S]*)$/);
  if (reenfileirado) return `Voltou para a fila, por uma pessoa: ${comPonto(reenfileirado[1])}`;
  const pago = motivo.match(/^marcado como pago: ([\s\S]*)$/);
  if (pago) return `Marcado como pago, por uma pessoa: ${comPonto(pago[1])}`;
  if (motivo === 'transferência iniciada') return 'Transferência iniciada.';
  return comPonto(motivo);
}

export function fraseDoEventoFinanceiro(evento: string | null): string {
  if (!evento) return '-';

  const repasse = evento.match(/^status_repasse: (\w+) -> (\w+)(?:: ([\s\S]*))?$/);
  if (repasse) {
    return repasse[3] ? fraseDoMotivoDoRepasse(repasse[3]) : `Passou de "${rotuloRepasse(repasse[1])}" para "${rotuloRepasse(repasse[2])}".`;
  }
  const contribuicao = evento.match(/^status_contribuicao: (\w+) -> (\w+)$/);
  if (contribuicao) return `Passou de "${rotuloContribuicao(contribuicao[1])}" para "${rotuloContribuicao(contribuicao[2])}".`;

  const estorno = evento.match(/^estorno_falhou \(tentativa (\d+)\): ([\s\S]*)$/);
  if (estorno) return `A tentativa ${estorno[1]} de devolução falhou: ${comPonto(estorno[2])}`;
  const aguardando = evento.match(/^estorno_aguardando_provedor \(tentativa (\d+)\)$/);
  if (aguardando) return `Tentativa ${aguardando[1]}: o provedor aceitou a devolução e ainda não a concluiu.`;

  const repasseEmRevisao = evento.match(/^repasse_evento_em_revisao_manual: (\w+)$/);
  if (repasseEmRevisao) {
    return `O provedor avisou que a transferência ficou "${rotuloRepasse(repasseEmRevisao[1])}", o que não bate com o sistema: está em revisão manual.`;
  }
  if (evento === 'pagamento_recebido_em_revisao_manual') return 'Chegou um pagamento que o sistema não aplicou sozinho: está em revisão manual.';
  const eventoEmRevisao = evento.match(/^evento_em_revisao_manual: (\w+)$/);
  if (eventoEmRevisao) {
    return `O provedor avisou "${rotuloContribuicao(eventoEmRevisao[1])}", e o sistema não aplicou sozinho: está em revisão manual.`;
  }
  if (evento.startsWith('chargeback_em_revisao_manual: ')) return 'Quem pagou contestou a compra no cartão: está em revisão manual.';

  const baixa = evento.match(/^revisao_manual_resolvida: ([\s\S]*)$/);
  if (baixa) return `Baixa dada por uma pessoa: ${comPonto(baixa[1])}`;
  const devolvido = evento.match(/^reembolso_manual_concluido: ([\s\S]*)$/);
  if (devolvido) return `Devolução registrada por uma pessoa: ${comPonto(devolvido[1])}`;
  const cobranca = evento.match(/^cobranca_vinculada: ([\s\S]*)$/);
  if (cobranca) return `Cobrança criada no provedor (${cobranca[1]}).`;

  return evento;
}
