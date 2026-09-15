import { Dica } from '../layout/tooltip';

// Ícone + texto (escondido via CSS quando a coluna aperta) + dica de hover -
// bloco que `GenericTable` já montava 6x (3 ações × botão) e que
// `bancada-pesquisador.tsx`/`bancada-campanha.tsx` (Campo de Testes, tabelas
// manuais que não podem usar `GenericTable` por causa do risco de linha)
// reimplementavam à mão, idêntico. Centralizado aqui (14-09-2026) - ver
// PENDENCIAS. Só `<button>` desde 14-09-2026 (contra-prompt Claude Web) - a
// variante `<Link to=...>` (páginas de verdade, `rotaBase`) não tem mais
// nenhum consumidor desde que a migração CRUD→Modal terminou.
type VarianteAcaoLinha = 'alterar' | 'excluir' | 'neutra';

interface AcaoLinhaProps {
  rotulo: string;
  icone: string;
  variante?: VarianteAcaoLinha;
  onClick?: () => void;
}

const CLASSE_VARIANTE: Record<VarianteAcaoLinha, string> = {
  alterar: ' crud-tabela__acao--alterar',
  excluir: ' crud-tabela__acao--excluir',
  neutra: '',
};

export function AcaoLinha({ rotulo, icone, variante = 'neutra', onClick }: AcaoLinhaProps) {
  const className = 'crud-tabela__acao dica' + CLASSE_VARIANTE[variante];

  return (
    <button type="button" className={className} onClick={onClick} aria-label={rotulo}>
      <i className={`fa-solid ${icone}`}></i>
      <span className="crud-tabela__acao-texto">{rotulo}</span>
      <Dica texto={rotulo} curta />
    </button>
  );
}
