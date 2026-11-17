import { Link } from 'react-router';
import { EstadoVazio } from '../../crud/estado-vazio';
import { primeiraTelaDoPainel } from '../../../services/router/rotas.constants';

// Tela do painel que a conta não consegue usar (17-11-2026): quem chega pelo endereço direto, por um link salvo ou
// pelo "voltar" vê o aviso no lugar de uma tela vazia ou de um erro de permissão. O menu e a busca já escondem a tela;
// quem protege os dados continua sendo o banco.
export function SemAcesso({ permissoes }: { permissoes: readonly string[] }) {
  return (
    <section className="space-y-4">
      <EstadoVazio
        icone="fa-lock"
        titulo="Você não tem acesso a esta tela."
        texto="As permissões do seu papel não incluem o que esta tela mostra. Se precisar dela, peça a um administrador."
      />
      <p className="text-center">
        <Link to={primeiraTelaDoPainel(permissoes)} className="btn btn-primary">
          Ir para o painel
        </Link>
      </p>
    </section>
  );
}
