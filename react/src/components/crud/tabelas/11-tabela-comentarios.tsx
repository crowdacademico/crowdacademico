// Comentários de uma campanha (autor, data, texto e posição do endosso), com Endossar/Remover endosso e Excluir para
// o dono da campanha. Usada nos Comentários recebidos de Minhas Campanhas (views/12-campanha/
// secao-comentarios-recebidos.tsx) e no Campo de Testes (T3, views/campo-testes/vida-campanha-ativa.tsx).

import { AcaoLinha } from '../acao-linha';
import { formatarData } from '../../../services/constant/util/formatacao.util';
import type { ComentarioResponse as Comentario } from '../../../services/17-comentario/type/comentario.type';

interface TabelaComentariosProps {
  comentarios: Comentario[];
  // Só o dono da campanha endossa e exclui: sem isso a coluna Ações nem aparece.
  ehDono: boolean;
  // Endossar fica indisponível (com o motivo na dica) quando os endossos ativos já chegaram ao limite (configuracoes).
  limiteAtingido: boolean;
  aoAlternarEndosso: (comentario: Comentario) => void;
  aoExcluir: (comentario: Comentario) => void;
}

export function TabelaComentarios({ comentarios, ehDono, limiteAtingido, aoAlternarEndosso, aoExcluir }: TabelaComentariosProps) {
  return (
    <div className="crud-tabela__wrapper">
      <table className="crud-tabela mb-4">
        <thead>
          <tr>
            <th>Autor</th>
            <th>Data</th>
            <th>Comentário</th>
            <th>Endosso</th>
            {ehDono && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {comentarios.map((item) => (
            <tr key={item.idComentario}>
              <td>{item.nomePesquisador ?? 'Pesquisador removido'}</td>
              <td>{formatarData(item.criadoEm)}</td>
              <td>{item.conteudo}</td>
              <td>{item.endossado ? <span className="badge badge-sucesso">#{item.ordemEndosso}</span> : '-'}</td>
              {ehDono && (
                <td>
                  <div className="crud-tabela__acoes">
                    <AcaoLinha
                      rotulo={item.endossado ? 'Remover endosso' : 'Endossar'}
                      icone={item.endossado ? 'fa-heart-crack' : 'fa-heart'}
                      onClick={() => aoAlternarEndosso(item)}
                      indisponivel={
                        !item.endossado && limiteAtingido
                          ? 'O limite de endossos ativos desta campanha já foi atingido. Remova um endosso para endossar outro comentário.'
                          : undefined
                      }
                    />
                    <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => aoExcluir(item)} />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
