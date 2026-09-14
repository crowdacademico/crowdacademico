import { Link } from 'react-router';

// Ícone + texto (escondido via CSS quando a coluna aperta) + dica de hover
// (`crud-tabela__acao-dica`) - bloco que `GenericTable` já montava 6x
// (3 ações × botão/link) e que `bancada-pesquisador.tsx`/`bancada-campanha.tsx`
// (Campo de Testes, tabelas manuais que não podem usar `GenericTable` por
// causa do risco de linha) reimplementavam à mão, idêntico. Centralizado
// aqui (14-09-2026) - ver PENDENCIAS.
type VarianteAcaoLinha = 'alterar' | 'excluir' | 'neutra';

interface AcaoLinhaProps {
  rotulo: string;
  icone: string;
  variante?: VarianteAcaoLinha;
  onClick?: () => void;
  to?: string;
}

const CLASSE_VARIANTE: Record<VarianteAcaoLinha, string> = {
  alterar: ' crud-tabela__acao--alterar',
  excluir: ' crud-tabela__acao--excluir',
  neutra: '',
};

export function AcaoLinha({ rotulo, icone, variante = 'neutra', onClick, to }: AcaoLinhaProps) {
  const className = 'crud-tabela__acao' + CLASSE_VARIANTE[variante];
  const conteudo = (
    <>
      <i className={`fa-solid ${icone}`}></i>
      <span className="crud-tabela__acao-texto">{rotulo}</span>
      <span className="crud-tabela__acao-dica" role="tooltip">{rotulo}</span>
    </>
  );

  if (to) {
    return (
      <Link className={className} to={to} aria-label={rotulo}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick} aria-label={rotulo}>
      {conteudo}
    </button>
  );
}
