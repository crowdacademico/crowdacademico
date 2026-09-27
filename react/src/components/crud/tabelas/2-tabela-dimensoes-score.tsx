import { formatarNomeDimensao } from '../../../services/constant/utils/formatacao.util';
import type { PerfilPesquisadorResponseScore } from '../../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

// Dimensões que compõem o score de um pesquisador (pontos obtidos e peso de cada uma). Só leitura. Usada no
// modal de usuário (views/1-usuario/modal-usuario.tsx, PainelScore), que busca o score.
interface TabelaDimensoesScoreProps {
  dimensoes: PerfilPesquisadorResponseScore['dimensoes'];
}

export function TabelaDimensoesScore({ dimensoes }: TabelaDimensoesScoreProps) {
  return (
    <table className="crud-tabela mt-2">
      <thead>
        <tr>
          <th>Dimensão</th>
          <th>Pontos</th>
          <th>Peso</th>
        </tr>
      </thead>
      <tbody>
        {dimensoes.map((dimensao) => (
          <tr key={dimensao.nomeDimensao}>
            <td>{formatarNomeDimensao(dimensao.nomeDimensao)}</td>
            <td>{dimensao.pontosObtidos}</td>
            <td>{dimensao.peso}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
