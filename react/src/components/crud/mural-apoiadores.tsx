import { AvatarUsuario } from '../layout/avatar-usuario';
import type { ApoiadorMural } from '../../services/18-recompensa/type/recompensa.type';

interface MuralApoiadoresProps {
  apoiadores: ApoiadorMural[];
}

// O Mural dos apoiadores (22-11-2026, como o "Project Backers" do Experiment.com): a foto de cada pessoa, ou a inicial,
// lado a lado. Quem apoiou como anônimo (ou sem conta) aparece com o ícone de pessoa, sem nome. O nome de quem tem fica
// no title e no texto para leitor de tela.
export function MuralApoiadores({ apoiadores }: MuralApoiadoresProps) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Apoiadores no mural">
      {apoiadores.map((apoiador, indice) => (
        <li key={indice} title={apoiador.nome ?? 'Apoiador anônimo'}>
          {apoiador.nome ? (
            <AvatarUsuario nome={apoiador.nome} foto={apoiador.fotoUrl} tamanho="lg" />
          ) : (
            <span className="w-14 h-14 rounded-full fundo-sutil border borda-padrao flex items-center justify-center texto-fraco">
              <i className="fa-solid fa-user text-xl" aria-hidden="true" />
            </span>
          )}
          <span className="sr-only">{apoiador.nome ?? 'Apoiador anônimo'}</span>
        </li>
      ))}
    </ul>
  );
}
