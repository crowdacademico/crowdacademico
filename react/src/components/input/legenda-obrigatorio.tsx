// O "*" dos campos obrigatórios (padrão de formulário: Nielsen Norman Group; WCAG 3.3.2) e a legenda que o explica.
// A cor é o token de erro (texto-erro), a mesma do tema claro e do escuro; nunca é o único sinal: o asterisco e a
// legenda dizem o mesmo sem cor. Quem usa o asterisco é o Campo (prop obrigatorio); a legenda vai uma vez, no topo do
// formulário que tem campos obrigatórios e opcionais misturados.
export function MarcaObrigatorio() {
  return (
    <span className="texto-erro ml-0.5" aria-hidden="true">
      *
    </span>
  );
}

export function LegendaObrigatorio({ className = '' }: { className?: string }) {
  return (
    <p className={`legenda texto-fraco ${className}`}>
      <span className="texto-erro">*</span> indica campo obrigatório
    </p>
  );
}
