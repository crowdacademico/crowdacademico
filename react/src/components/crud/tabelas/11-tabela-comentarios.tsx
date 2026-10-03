// Comentários de uma campanha (autor, data, texto e posição do endosso), com Endossar/Remover endosso e Excluir para
// o dono da campanha. Usada nos comentários da campanha (views/12-campanha/secao-comentarios-recebidos.tsx: o dono
// age, a gestão só lê) e na Bancada da Campanha.

import { AcaoLinha } from '../acao-linha';
import { formatarData } from '../../../services/constant/util/formatacao.util';
import type { ComentarioResponse as Comentario } from '../../../services/17-comentario/type/comentario.type';
import { CaixaTabela } from './caixa-tabela';
import { TextoResumido } from '../texto-resumido';

interface TabelaComentariosProps {
  comentarios: Comentario[];
  // Só o dono da campanha endossa e exclui: sem isso a coluna Ações nem aparece.
  ehDono: boolean;
  // Endossar fica indisponível (com o motivo na dica) quando os endossos ativos já chegaram ao limite (configuracoes).
  // As ações só existem para o dono (`ehDono`); para quem só lê, não precisa passar.
  limiteAtingido?: boolean;
  aoAlternarEndosso?: (comentario: Comentario) => void;
  aoExcluir?: (comentario: Comentario) => void;
  // Denunciar o autor à moderação (denúncia contra o perfil, com o comentário no relato).
  aoDenunciar?: (comentario: Comentario) => void;
  // Nome da tabela para o leitor de tela: duas tabelas na mesma tela precisam de nomes diferentes.
  rotulo?: string;
}

export function TabelaComentarios({ comentarios, ehDono, limiteAtingido = false, aoAlternarEndosso, aoExcluir, aoDenunciar, rotulo = 'Comentários da campanha' }: TabelaComentariosProps) {
  return (
    <CaixaTabela rotulo={rotulo}>
      <table className="crud-tabela mb-4">
        <thead>
          <tr>
            <th className="crud-tabela__col--id">id</th>
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
              <td className="crud-tabela__col--id">{item.idComentario}</td>
              <td>{item.nomePesquisador ?? 'Pesquisador removido'}</td>
              <td>{formatarData(item.criadoEm)}</td>
              <td>
                <TextoResumido texto={item.conteudo} titulo={`Comentário de ${item.nomePesquisador ?? 'pesquisador removido'}`} />
              </td>
              <td>{item.endossado ? <span className="badge badge-sucesso">#{item.ordemEndosso}</span> : '-'}</td>
              {ehDono && (
                <td>
                  <div className="crud-tabela__acoes">
                    <AcaoLinha
                      rotulo={item.endossado ? 'Remover endosso' : 'Endossar'}
                      icone={item.endossado ? 'fa-heart-crack' : 'fa-heart'}
                      onClick={() => aoAlternarEndosso?.(item)}
                      indisponivel={
                        !item.endossado && limiteAtingido
                          ? 'O limite de endossos ativos desta campanha já foi atingido. Remova um endosso para endossar outro comentário.'
                          : undefined
                      }
                    />
                    <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => aoExcluir?.(item)} />
                    {aoDenunciar && item.idPesquisador !== null && (
                      <AcaoLinha rotulo="Denunciar autor" icone="fa-flag" variante="excluir" onClick={() => aoDenunciar(item)} />
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
