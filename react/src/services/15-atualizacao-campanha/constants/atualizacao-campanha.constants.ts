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

// Por que o Alterar de uma atualização fica apagado (21-11-2026; o banco recusa com 91064, fn_atualizacao_trava_edicao).
// `campanhaAceita`: a campanha está ativa, com sucesso ou não atingida (STATUS_ACEITA_ATUALIZACAO).
export function motivoAtualizacaoNaoEditavel(atualizacao: { ocultadaModeracao: boolean }, campanhaAceita: boolean): string | undefined {
  if (atualizacao.ocultadaModeracao) return 'Excluída pela moderação: não pode ser alterada.';
  if (!campanhaAceita) return 'Campanha encerrada: as atualizações dela não podem mais ser alteradas.';
  return undefined;
}
