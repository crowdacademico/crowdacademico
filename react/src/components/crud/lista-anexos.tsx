import type { AnexoAtualizacao } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';

function iconeDoAnexo(anexo: AnexoAtualizacao): string {
  if (anexo.tipo === 'link') return 'fa-link';
  return anexo.tipoMime === 'application/pdf' ? 'fa-file-pdf' : 'fa-image';
}

// Os anexos de uma atualização, cada um abrindo numa aba nova: o ícone diz se é PDF, imagem ou link.
export function ListaAnexos({ anexos }: { anexos: AnexoAtualizacao[] }) {
  if (anexos.length === 0) {
    return <span className="texto-fraco">-</span>;
  }
  return (
    <ul className="space-y-1">
      {anexos.map((anexo) => (
        <li key={`${anexo.tipo}-${anexo.idAnexo}`} className="flex items-center gap-2">
          <i className={`fa-solid ${iconeDoAnexo(anexo)}`} aria-hidden="true"></i>
          <a href={anexo.url} target="_blank" rel="noopener noreferrer" className="link-texto break-words">
            {anexo.nome}
          </a>
        </li>
      ))}
    </ul>
  );
}
