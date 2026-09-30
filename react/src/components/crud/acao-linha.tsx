import { Dica } from '../layout/tooltip';

// Ícone + texto (escondido via CSS quando a coluna aperta) + dica de hover: bloco que `GenericTable` monta 6x
// (3 ações × botão) e que `bancada-pesquisador.tsx`/`bancada-campanha.tsx` (Campo de Testes, tabelas manuais
// que não podem usar `GenericTable` por causa do risco de linha) reimplementariam à mão, idêntico. Só
// `<button>`: a variante `<Link to=...>` (páginas de verdade, `rotaBase`) não tem consumidor desde que a
// migração CRUD→Modal terminou.
// 'escolher': confirmar/salvar (ex.: Salvar da edição na linha, components/crud/tabelas/tabela-editavel.tsx).
type VarianteAcaoLinha = 'alterar' | 'excluir' | 'escolher' | 'neutra';

interface AcaoLinhaProps {
  rotulo: string;
  icone: string;
  variante?: VarianteAcaoLinha;
  onClick?: () => void;
  // Motivo de a ação não se aplicar a esta linha: o botão fica apagado, não reage ao clique e a dica mostra o motivo.
  indisponivel?: string;
}

const CLASSE_VARIANTE: Record<VarianteAcaoLinha, string> = {
  alterar: ' crud-tabela__acao--alterar',
  excluir: ' crud-tabela__acao--excluir',
  escolher: ' crud-tabela__acao--escolher',
  neutra: '',
};

export function AcaoLinha({ rotulo, icone, variante = 'neutra', onClick, indisponivel }: AcaoLinhaProps) {
  const className =
    'crud-tabela__acao dica' + CLASSE_VARIANTE[variante] + (indisponivel ? ' crud-tabela__acao--indisponivel' : '');

  // aria-disabled (não disabled): continua focável pelo teclado, para a dica com o motivo aparecer.
  return (
    <button
      type="button"
      className={className}
      onClick={indisponivel ? undefined : onClick}
      aria-label={indisponivel ? `${rotulo}: ${indisponivel}` : rotulo}
      aria-disabled={indisponivel ? true : undefined}
    >
      <i className={`fa-solid ${icone}`}></i>
      <span className="crud-tabela__acao-texto">{rotulo}</span>
      <Dica texto={indisponivel ?? rotulo} curta={!indisponivel} direita={Boolean(indisponivel)} />
    </button>
  );
}
