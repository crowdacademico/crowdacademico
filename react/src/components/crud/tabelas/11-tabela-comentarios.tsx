// Comentários de uma campanha (autor, texto e posição do endosso), com Endossar/Remover endosso para o dono da
// campanha. Usada no Campo de Testes (T3, views/campo-testes/vida-campanha-ativa.tsx), que busca e endossa.

// `comentario` ainda não tem type/api formal em services/: formato do DTO do Nest.
export interface Comentario {
  idComentario: number;
  idCampanha: number;
  // `null`: o autor pode não existir mais (conta excluída/anonimizada).
  idPesquisador: number | null;
  conteudo: string;
  endossado: boolean;
  ativo: boolean;
  ordemEndosso: number | null;
}

interface TabelaComentariosProps {
  comentarios: Comentario[];
  nomeDe: (idUsuario: number | null) => string;
  // Só o dono da campanha endossa: sem isso a coluna Ações nem aparece.
  podeEndossar: boolean;
  // Endossar fica desabilitado quando os endossos ativos já chegaram ao limite (configuracoes).
  limiteAtingido: boolean;
  aoAlternarEndosso: (comentario: Comentario) => void;
}

export function TabelaComentarios({ comentarios, nomeDe, podeEndossar, limiteAtingido, aoAlternarEndosso }: TabelaComentariosProps) {
  return (
    <div className="crud-tabela__wrapper">
      <table className="crud-tabela mb-4">
        <thead>
          <tr>
            <th>Autor</th>
            <th>Comentário</th>
            <th>Endosso</th>
            {podeEndossar && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {comentarios.map((item) => (
            <tr key={item.idComentario}>
              <td>{nomeDe(item.idPesquisador)}</td>
              <td>{item.conteudo}</td>
              <td>{item.endossado ? <span className="badge badge-sucesso">#{item.ordemEndosso}</span> : '-'}</td>
              {podeEndossar && (
                <td>
                  <button
                    type="button"
                    className="crud-tabela__acao"
                    onClick={() => aoAlternarEndosso(item)}
                    disabled={!item.endossado && limiteAtingido}
                  >
                    {item.endossado ? 'Remover endosso' : 'Endossar'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
