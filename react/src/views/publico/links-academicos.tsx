import type { LinkAcademicoPublico } from './use-links-academicos';

// Um link externo: abre em outra aba, sem passar a página de origem (noopener noreferrer), e avisa o leitor de tela.
export function LinkAcademicoExterno({ link, className = '' }: { link: LinkAcademicoPublico; className?: string }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 link-texto break-all ${className}`}
    >
      <i className={`${link.icone} w-4 text-center`} aria-hidden="true" />
      {link.rotulo}
      <span className="sr-only"> (abre em outra aba)</span>
    </a>
  );
}
