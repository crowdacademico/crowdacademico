// Prazo de carência da exclusão de conta (22-11-2026). O login (senha ou Google) devolve isto, no lugar da sessão,
// quando a senha confere mas a própria pessoa tinha excluído a conta e ainda está dentro do prazo: o React mostra o
// modal "Sua conta está marcada para exclusão" com a data e o botão "Reativar", que repete o login com
// `reativar: true`. Resposta 200, não erro: não é falha de quem entrou, e o React precisa da data.
export class AuthResponseExclusaoAgendada {
  exclusaoAgendada: true;
  // Data e hora em que a exclusão vira definitiva (ISO 8601).
  exclusaoDefinitivaEm: string;
}
