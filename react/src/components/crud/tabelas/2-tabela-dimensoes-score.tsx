import type { PerfilPesquisadorResponseScore } from '../../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

// Dimensões que compõem o score de um pesquisador (pontos obtidos e o máximo de cada uma, o mesmo nome da tela Pontuação). Só leitura. Usada no
// Consultar Usuário (views/1-usuario/modal-consultar-usuario.tsx), que busca o score.
interface TabelaDimensoesScoreProps {
  dimensoes: PerfilPesquisadorResponseScore['dimensoes'];
}

export function TabelaDimensoesScore({ dimensoes }: TabelaDimensoesScoreProps) {
  return (
    <table className="crud-tabela mt-2">
      <thead>
        <tr>
          <th>Dimensão</th>
          <th className="crud-tabela__celula--centralizada">Pontos</th>
          <th className="crud-tabela__celula--centralizada">Máximo</th>
        </tr>
      </thead>
      <tbody>
        {dimensoes.map((dimensao) => (
          <tr key={dimensao.nomeDimensao}>
            <td>{dimensao.rotuloDimensao}</td>
            <td className="crud-tabela__celula--centralizada">{dimensao.pontosObtidos}</td>
            <td className="crud-tabela__celula--centralizada">{Number(dimensao.peso).toLocaleString('pt-BR')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
