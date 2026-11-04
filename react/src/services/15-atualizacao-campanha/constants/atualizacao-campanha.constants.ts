import type { FaseAtualizacao, TipoAtualizacao } from '../../constant/type/enums-do-banco.gerado';
import { listaCompleta } from '../../constant/util/lista-completa.util';

// Os VALORES vêm do banco (ENUMs fase_atualizacao e tipo_atualizacao); aqui só a ordem de exibição e o rótulo
// legível (RF-053). `listaCompleta` faz o compilador acusar se um valor do banco faltar.
export const ORDEM_FASE_ATUALIZACAO = listaCompleta<FaseAtualizacao>()(['andamento', 'resultado_preliminar', 'resultado_final'] as const);
export const ORDEM_TIPO_ATUALIZACAO = listaCompleta<TipoAtualizacao>()(['texto', 'imagem', 'pdf', 'linkexterno'] as const);

export const ROTULO_FASE_ATUALIZACAO: Record<FaseAtualizacao, string> = {
  andamento: 'Andamento',
  resultado_preliminar: 'Resultado preliminar',
  resultado_final: 'Resultado final',
};

export const ROTULO_TIPO_ATUALIZACAO: Record<TipoAtualizacao, string> = {
  texto: 'Texto',
  imagem: 'Imagem',
  pdf: 'PDF',
  linkexterno: 'Link externo',
};

// Situação em palavras: visível, ou excluída mantendo o registro, pela moderação ou pelo próprio dono ("por você" na
// tela dele, "pelo pesquisador" nas outras).
export function rotuloSituacaoAtualizacao(
  atualizacao: { ativo: boolean; ocultadaModeracao: boolean },
  doDono = false,
): string {
  if (atualizacao.ativo) return 'Visível';
  if (atualizacao.ocultadaModeracao) return 'Excluída pela moderação';
  return doDono ? 'Excluída por você' : 'Excluída pelo pesquisador';
}

// O formato sai dos anexos, sem perguntar (RF-053): PDF pesa mais que imagem, imagem mais que link.
export function formatoPelosAnexos(tiposMime: string[], temLink: boolean): TipoAtualizacao {
  if (tiposMime.includes('application/pdf')) return 'pdf';
  if (tiposMime.some((tipo) => tipo.startsWith('image/'))) return 'imagem';
  return temLink ? 'linkexterno' : 'texto';
}
