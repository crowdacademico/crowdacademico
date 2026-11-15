import { Link } from 'react-router';

type BotaoCriarProps = { rotulo?: string } & ({ aoClicar: () => void; para?: never } | { para: string; aoClicar?: never });

// O "Criar" do topo das listas: abre o modal de criar (`aoClicar`) ou vai para a página de
// criar (`para`). Nunca quebra o texto nem encolhe (whitespace-nowrap/shrink-0): espremido ao lado de uma lista
// de seleção, "Nova recompensa" virava duas linhas e empurrava a tabela para baixo. Um lugar só para o dia em que o botão ganhar regra própria (ex.: só aparecer com permissão).
export function BotaoCriar({ rotulo = 'Criar', aoClicar, para }: BotaoCriarProps) {
  if (para) {
    return (
      <Link to={para} className="btn btn-primary whitespace-nowrap shrink-0">
        {rotulo}
      </Link>
    );
  }
  return (
    <button type="button" className="btn btn-primary whitespace-nowrap shrink-0" onClick={aoClicar}>
      {rotulo}
    </button>
  );
}
