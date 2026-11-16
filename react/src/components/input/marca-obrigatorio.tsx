// O "*" dos campos obrigatórios (padrão de formulário: Nielsen Norman Group; WCAG 3.3.2), usado pelo Campo (prop
// obrigatorio). A cor é o token de erro (texto-erro), a mesma do tema claro e do escuro; escondido do leitor de tela, que
// ouve "obrigatório" pelo aria-required do campo. Sem a legenda "* indica campo obrigatório" (16-11-2026, Lucas).
export function MarcaObrigatorio() {
  return (
    <span className="texto-erro ml-0.5" aria-hidden="true">
      *
    </span>
  );
}
