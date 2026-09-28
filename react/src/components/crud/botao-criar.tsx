import { Link } from 'react-router';

type BotaoCriarProps = { rotulo?: string } & ({ aoClicar: () => void; para?: never } | { para: string; aoClicar?: never });

// O "Criar" do topo das listas (e do Campo de Testes): abre o modal de criar (`aoClicar`) ou vai para a página de
// criar (`para`). Um lugar só para o dia em que o botão ganhar regra própria (ex.: só aparecer com permissão).
export function BotaoCriar({ rotulo = 'Criar', aoClicar, para }: BotaoCriarProps) {
  if (para) {
    return (
      <Link to={para} className="btn btn-primary">
        {rotulo}
      </Link>
    );
  }
  return (
    <button type="button" className="btn btn-primary" onClick={aoClicar}>
      {rotulo}
    </button>
  );
}
